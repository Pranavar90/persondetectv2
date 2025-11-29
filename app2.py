import os
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from pathlib import Path
import shutil
from ultralytics import YOLO
import json
import csv
from collections import defaultdict
import torch
import subprocess
from imageio_ffmpeg import get_ffmpeg_exe
import hashlib

# Check GPU availability
GPU_AVAILABLE = torch.cuda.is_available()
DEVICE = 0 if GPU_AVAILABLE else 'cpu'
print(f"\n{'='*60}")
print(f"🔧 GPU Status: {'✓ ENABLED' if GPU_AVAILABLE else '✗ DISABLED (using CPU)'}")
if GPU_AVAILABLE:
    print(f"🎮 GPU Device: {torch.cuda.get_device_name(0)}")
    print(f"💾 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
print(f"{'='*60}\n")

app = FastAPI(title="Person Detection & Tracking - Zone & Line Counting")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = Path('uploads')
OUTPUT_FOLDER = Path('outputs')
STATIC_FOLDER = Path('static')
TEMPLATES_FOLDER = Path('templates')
DATA_FOLDER = Path('data')
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB

# Create necessary folders
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)
STATIC_FOLDER.mkdir(exist_ok=True)
TEMPLATES_FOLDER.mkdir(exist_ok=True)
DATA_FOLDER.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

# CUSTOMER ZONE CONFIGURATION
CUSTOMER_ZONE_OVERLAP_THRESHOLD = 0.20  # 20% overlap

# Processing progress tracking
processing_progress: Dict[str, Dict] = {}
# Shared frame buffers for live streaming: {progress_id: bytes}
frame_buffers: Dict[str, bytes] = {}

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Pydantic models
class Point(BaseModel):
    x: float
    y: float

class Zone(BaseModel):
    name: str
    type: str = "customer"
    points: List[Point]
    color: List[int]

class Line(BaseModel):
    name: str
    start: Point
    end: Point
    color: List[int]

class ProcessRequest(BaseModel):
    filename: str
    zones: List[Zone]
    lines: List[Line]

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def format_timestamp(frame_number: int, fps: float) -> str:
    """Convert frame number to MM:SS timestamp"""
    total_seconds = frame_number / fps
    minutes = int(total_seconds // 60)
    seconds = int(total_seconds % 60)
    return f"{minutes:02d}:{seconds:02d}"

def consolidate_zone_visits(zone_history: List[Dict], fps: float) -> List[Dict]:
    """
    Consolidate multiple zone visits into one entry per zone.
    For each zone, shows first entry time and last exit time.

    Args:
        zone_history: List of zone visit dictionaries
        fps: Frames per second for duration calculation

    Returns:
        Consolidated list with one entry per unique zone
    """
    if not zone_history:
        return []

    # Group visits by zone name
    zone_groups = {}
    for visit in zone_history:
        zone_name = visit['zone']
        if zone_name not in zone_groups:
            zone_groups[zone_name] = []
        zone_groups[zone_name].append(visit)

    # For each zone, consolidate to first entry and last exit
    consolidated = []
    for zone_name, visits in zone_groups.items():
        # Find first entry (earliest entry_frame)
        first_visit = min(visits, key=lambda x: x['entry_frame'])
        # Find last exit (latest exit_frame)
        last_visit = max(visits, key=lambda x: x['exit_frame'] if x['exit_frame'] is not None else x['entry_frame'])

        # Use last exit frame, or last entry frame if no exit
        exit_frame = last_visit['exit_frame'] if last_visit['exit_frame'] is not None else last_visit['entry_frame']
        exit_time = last_visit['exit_time'] if last_visit['exit_time'] is not None else last_visit['entry_time']

        # Calculate total duration from first entry to last exit
        duration_seconds = (exit_frame - first_visit['entry_frame']) / fps
        duration = f"{int(duration_seconds // 60):02d}:{int(duration_seconds % 60):02d}"

        consolidated.append({
            'zone': zone_name,
            'entry_frame': first_visit['entry_frame'],
            'entry_time': first_visit['entry_time'],
            'exit_frame': exit_frame,
            'exit_time': exit_time,
            'duration': duration
        })

    return consolidated

class PersonTracker:
    """Track individual person data throughout the video"""
    def __init__(self, person_id: int, first_seen_frame: int, fps: float):
        self.id = person_id
        self.first_seen_frame = first_seen_frame
        self.last_seen_frame = first_seen_frame
        self.fps = fps
        self.zone_history = []
        self.current_zones = set()
        self.line_crossings = []

    def update_frame(self, frame_number: int):
        """Update last seen frame"""
        self.last_seen_frame = frame_number

    def enter_zone(self, zone_name: str, frame_number: int):
        """Record zone entry"""
        if zone_name not in self.current_zones:
            self.current_zones.add(zone_name)
            self.zone_history.append({
                'zone': zone_name,
                'entry_frame': frame_number,
                'entry_time': format_timestamp(frame_number, self.fps),
                'exit_frame': None,
                'exit_time': None,
                'duration': None
            })

    def exit_zone(self, zone_name: str, frame_number: int):
        """Record zone exit"""
        if zone_name in self.current_zones:
            self.current_zones.remove(zone_name)
            for i in range(len(self.zone_history) - 1, -1, -1):
                if self.zone_history[i]['zone'] == zone_name and self.zone_history[i]['exit_frame'] is None:
                    self.zone_history[i]['exit_frame'] = frame_number
                    self.zone_history[i]['exit_time'] = format_timestamp(frame_number, self.fps)
                    duration_sec = (frame_number - self.zone_history[i]['entry_frame']) / self.fps
                    self.zone_history[i]['duration'] = f"{int(duration_sec // 60):02d}:{int(duration_sec % 60):02d}"
                    break

    def record_line_crossing(self, line_name: str, direction: str, frame_number: int):
        """Record line crossing event"""
        self.line_crossings.append({
            'line': line_name,
            'direction': direction,
            'frame': frame_number,
            'time': format_timestamp(frame_number, self.fps)
        })

    def finalize(self):
        """Close any open zone visits and consolidate to first entry + last exit per zone"""
        for zone_name in list(self.current_zones):
            self.exit_zone(zone_name, self.last_seen_frame)

        # Consolidate zone visits: one entry per zone (first entry + last exit)
        self.zone_history = consolidate_zone_visits(self.zone_history, self.fps)

    def get_summary(self) -> Dict:
        """Get complete summary of person's activity"""
        total_time = (self.last_seen_frame - self.first_seen_frame) / self.fps
        return {
            'id': self.id,
            'first_seen': format_timestamp(self.first_seen_frame, self.fps),
            'last_seen': format_timestamp(self.last_seen_frame, self.fps),
            'total_time': f"{int(total_time // 60):02d}:{int(total_time % 60):02d}",
            'zone_visits': self.zone_history,
            'line_crossings': self.line_crossings,
            'total_zone_visits': len(self.zone_history),
            'total_line_crossings': len(self.line_crossings)
        }

def point_in_polygon(point, polygon):
    """Check if a point is inside a polygon using ray casting algorithm"""
    x, y = point
    n = len(polygon)
    inside = False

    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside

def which_side_of_line(point, line_start, line_end):
    """Determine which side of the line a point is on"""
    x0, y0 = point
    x1, y1 = line_start
    x2, y2 = line_end
    return ((x2 - x1) * (y0 - y1) - (y2 - y1) * (x0 - x1))

def point_to_line_distance(point, line_start, line_end):
    """Calculate perpendicular distance from point to line"""
    x0, y0 = point
    x1, y1 = line_start
    x2, y2 = line_end

    num = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
    den = np.sqrt((y2 - y1)**2 + (x2 - x1)**2)

    if den == 0:
        return 0
    return num / den

def check_line_crossing(track_id, new_centroid, line_start, line_end, track_history, track_counted, line_counts, line_offset=15):
    """Check if track crossed the counting line"""
    if track_counted.get(track_id, False):
        return None

    if track_id not in track_history:
        track_history[track_id] = new_centroid
        return None

    old_centroid = track_history[track_id]
    old_side = which_side_of_line(old_centroid, line_start, line_end)
    new_side = which_side_of_line(new_centroid, line_start, line_end)
    track_history[track_id] = new_centroid

    if old_side * new_side < 0:
        dist = point_to_line_distance(new_centroid, line_start, line_end)
        if dist < line_offset * 3:
            if old_side > 0 and new_side < 0:
                line_counts['in'] += 1
                track_counted[track_id] = True
                print(f"✓ Person IN  [ID: {track_id}] - Total IN: {line_counts['in']}")
                return 'in'
            elif old_side < 0 and new_side > 0:
                line_counts['out'] += 1
                track_counted[track_id] = True
                print(f"✓ Person OUT [ID: {track_id}] - Total OUT: {line_counts['out']}")
                return 'out'
    return None

def process_video(video_path: str, zones: List[Zone], lines: List[Line], output_path: str, progress_id: str = None) -> Dict:
    """Process video with ByteTrack tracking - Using fine.py detection logic"""
    
    def update_progress(stage: str, percent: int, message: str):
        """Update processing progress"""
        if progress_id:
            processing_progress[progress_id] = {
                'stage': stage,
                'percent': percent,
                'message': message
            }
            print(f"📊 Progress [{progress_id}]: {stage} - {percent}% - {message}")
    
    update_progress('loading', 5, 'Loading AI model...')
    
    # Load model on GPU if available - MATCHING fine.py style
    print(f"\n🔄 Loading YOLO model on {'GPU' if GPU_AVAILABLE else 'CPU'}...")
    model = YOLO('yolo11x.pt')
    if GPU_AVAILABLE:
        model.to(device="cuda")  # Match fine.py style
    else:
        model.to(device="cpu")
    print(f"✓ Model loaded successfully on {'cuda' if GPU_AVAILABLE else 'cpu'}")
    
    update_progress('loading', 10, 'Model loaded, opening video...')

    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    if fps == 0:
        fps = 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Video writer - use AVI container with MJPG for reliable frame-by-frame writing
    temp_output = str(Path(output_path).parent / f"temp_{Path(output_path).stem}.avi")
    fourcc = cv2.VideoWriter_fourcc(*'MJPG')
    out = cv2.VideoWriter(temp_output, fourcc, float(fps), (width, height))

    if not out.isOpened():
        print("Warning: Could not open video writer with MJPG codec, trying mp4v")
        temp_output = str(Path(output_path).parent / f"temp_{Path(output_path).name}")
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_output, fourcc, float(fps), (width, height))
    
    print(f"📹 Video output: {width}x{height} @ {fps} FPS")

    # Line counting data structures
    line_data = {}
    for line in lines:
        line_data[line.name] = {
            'start': (int(line.start.x * width), int(line.start.y * height)),
            'end': (int(line.end.x * width), int(line.end.y * height)),
            'color': line.color,
            'track_history': {},
            'track_counted': {},
            'counts': {'in': 0, 'out': 0},
            'timeline': []  # Timeline for cumulative counts
        }

    zone_ids = {zone.name: set() for zone in zones}
    track_history = {}
    frame_count = 0
    # total_frames already set above

    # Person tracking system
    person_trackers = {}
    previous_zone_assignments = {}

    # ID mapping: ByteTrack ID -> Sequential ID
    id_mapping = {}
    next_sequential_id = 1

    # Timeline data aggregation
    # Staff zones: 5-second intervals (binary 1/0)
    # Customer zones: per-second counts
    staff_zone_timeline = defaultdict(list)  # {zone_name: [(time, active)]}
    customer_zone_timeline = defaultdict(list)  # {zone_name: [(time, count)]}

    # Per-second and per-5-second buckets
    current_second = 0
    current_5sec = 0
    staff_zone_active_in_5sec = defaultdict(bool)  # Track if zone was active in current 5-sec interval
    customer_zone_counts_in_sec = defaultdict(list)  # Track counts during current second

    print(f"Processing video: {total_frames} frames")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        if frame_count % 30 == 0:
            progress_percent = 10 + int((frame_count / total_frames) * 75)  # 10-85%
            update_progress('processing', progress_percent, f'Processing frame {frame_count}/{total_frames}')
            print(f"Processing frame {frame_count}/{total_frames}")

        # Calculate current time buckets
        current_time_sec = frame_count / fps
        new_second = int(current_time_sec)
        new_5sec = int(current_time_sec / 5) * 5

        # Track with ByteTrack - EXACT fine.py call (no conf/iou/device params)
        results = model.track(
            frame,
            classes=[0],
            persist=True,
            verbose=False,
            tracker="botsort.yaml"
        )

        if results and len(results) > 0:
            boxes = results[0].boxes

            if boxes is not None and boxes.id is not None and len(boxes) > 0:
                track_ids = boxes.id.cpu().numpy().astype(int)
                xyxy = boxes.xyxy.cpu().numpy()
                confidences = boxes.conf.cpu().numpy()

                labels = []
                for i, bytetrack_id in enumerate(track_ids):
                    # Map to sequential ID
                    if bytetrack_id not in id_mapping:
                        id_mapping[bytetrack_id] = next_sequential_id
                        print(f"New person detected: ID {next_sequential_id}")
                        next_sequential_id += 1

                    tracker_id = id_mapping[bytetrack_id]

                    # Initialize person tracker
                    if tracker_id not in person_trackers:
                        person_trackers[tracker_id] = PersonTracker(tracker_id, frame_count, fps)
                        previous_zone_assignments[tracker_id] = set()

                    # Update last seen frame
                    person_trackers[tracker_id].update_frame(frame_count)

                    x1, y1, x2, y2 = xyxy[i].astype(int)
                    conf = confidences[i]

                    # Calculate centroid
                    centroid_x = (x1 + x2) // 2
                    centroid_y = (y1 + y2) // 2
                    centroid = (centroid_x, centroid_y)

                    # Track history for trails
                    if tracker_id not in track_history:
                        track_history[tracker_id] = []
                    track_history[tracker_id].append(centroid)
                    if len(track_history[tracker_id]) > 30:
                        track_history[tracker_id] = track_history[tracker_id][-30:]

                    # Draw bounding box
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                    # Draw label with ID
                    label = f"ID:{tracker_id} {conf:.2f}"
                    labels.append(label)
                    (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                    cv2.rectangle(frame, (x1, y1 - label_h - 10), (x1 + label_w, y1), (0, 255, 0), -1)
                    cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

                    # Draw centroid
                    cv2.circle(frame, centroid, 6, (255, 0, 255), -1)
                    cv2.circle(frame, centroid, 8, (255, 255, 255), 2)

                    # Draw tracking trail
                    points = track_history[tracker_id]
                    if len(points) > 1:
                        for j in range(1, len(points)):
                            thickness = max(1, int(3 * (j / len(points))))
                            cv2.line(frame, points[j-1], points[j], (255, 0, 255), thickness)

                # Process zones - CENTROID ONLY for both types
                for zone in zones:
                    zone_name = zone.name
                    zone_type = zone.type
                    polygon_points = [[int(p.x * width), int(p.y * height)] for p in zone.points]

                    zone_ids[zone_name] = set()

                    # Both staff and customer zones use centroid detection
                    for idx, bytetrack_id in enumerate(track_ids):
                        tracker_id = id_mapping[bytetrack_id]
                        x1, y1, x2, y2 = xyxy[idx].astype(int)
                        centroid_x = (x1 + x2) // 2
                        centroid_y = (y1 + y2) // 2
                        centroid = (centroid_x, centroid_y)

                        if point_in_polygon(centroid, polygon_points):
                            zone_ids[zone_name].add(tracker_id)

                # Update person trackers with zone entry/exit
                for zone_name, current_ids in zone_ids.items():
                    for tracker_id in person_trackers.keys():
                        was_in_zone = zone_name in previous_zone_assignments.get(tracker_id, set())
                        is_in_zone = tracker_id in current_ids

                        if is_in_zone and not was_in_zone:
                            person_trackers[tracker_id].enter_zone(zone_name, frame_count)
                        elif was_in_zone and not is_in_zone:
                            person_trackers[tracker_id].exit_zone(zone_name, frame_count)

                    for tracker_id in current_ids:
                        if tracker_id not in previous_zone_assignments:
                            previous_zone_assignments[tracker_id] = set()
                        previous_zone_assignments[tracker_id].add(zone_name)

                    for tracker_id in person_trackers.keys():
                        if tracker_id not in current_ids and zone_name in previous_zone_assignments.get(tracker_id, set()):
                            previous_zone_assignments[tracker_id].discard(zone_name)

                # Aggregate timeline data for zones
                for zone in zones:
                    zone_name = zone.name
                    zone_type = zone.type
                    people_count = len(zone_ids[zone_name])

                    if zone_type == 'staff':
                        # Staff zone: Track if active in 5-second interval
                        if people_count > 0:
                            staff_zone_active_in_5sec[zone_name] = True

                        # Check if we crossed into a new 5-second interval
                        if new_5sec != current_5sec:
                            # Save previous interval data
                            active_value = 1 if staff_zone_active_in_5sec.get(zone_name, False) else 0
                            staff_zone_timeline[zone_name].append({
                                'time': format_timestamp(int(current_5sec * fps), fps),
                                'time_seconds': current_5sec,
                                'active': active_value
                            })
                            # Reset for new interval
                            staff_zone_active_in_5sec[zone_name] = (people_count > 0)

                    else:  # customer zone
                        # Customer zone: Track count per second
                        customer_zone_counts_in_sec[zone_name].append(people_count)

                        # Check if we crossed into a new second
                        if new_second != current_second:
                            # Calculate average for previous second
                            counts = customer_zone_counts_in_sec.get(zone_name, [0])
                            avg_count = sum(counts) / len(counts) if counts else 0
                            customer_zone_timeline[zone_name].append({
                                'time': format_timestamp(int(current_second * fps), fps),
                                'time_seconds': current_second,
                                'count': round(avg_count, 1)
                            })
                            # Reset for new second
                            customer_zone_counts_in_sec[zone_name] = []

                # Process line crossings
                for i, bytetrack_id in enumerate(track_ids):
                    tracker_id = id_mapping[bytetrack_id]
                    x1, y1, x2, y2 = xyxy[i].astype(int)
                    centroid_x = (x1 + x2) // 2
                    centroid_y = (y1 + y2) // 2
                    centroid = (centroid_x, centroid_y)

                    for line_name, line_info in line_data.items():
                        direction = check_line_crossing(
                            tracker_id,
                            centroid,
                            line_info['start'],
                            line_info['end'],
                            line_info['track_history'],
                            line_info['track_counted'],
                            line_info['counts']
                        )
                        if direction and tracker_id in person_trackers:
                            person_trackers[tracker_id].record_line_crossing(line_name, direction, frame_count)
                            # Add to timeline
                            line_info['timeline'].append({
                                'time': format_timestamp(frame_count, fps),
                                'time_seconds': current_time_sec,
                                'in_count': line_info['counts']['in'],
                                'out_count': line_info['counts']['out']
                            })

        # Update time trackers
        if new_second != current_second:
            current_second = new_second
        if new_5sec != current_5sec:
            current_5sec = new_5sec

        # Draw zones
        for zone in zones:
            zone_name = zone.name
            polygon = [(int(p.x * width), int(p.y * height)) for p in zone.points]
            pts = np.array(polygon, np.int32).reshape((-1, 1, 2))

            people_count = len(zone_ids[zone_name])
            zone_type = zone.type

            if people_count > 0:
                border_color = (0, 255, 0)
                fill_color = (0, 255, 0)
            else:
                border_color = (0, 0, 255)
                fill_color = (0, 0, 255)

            overlay = frame.copy()
            cv2.fillPoly(overlay, [pts], fill_color)
            cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
            cv2.polylines(frame, [pts], True, border_color, 3)

            type_label = "STAFF" if zone_type == 'staff' else "CUSTOMER"
            detection_method = "(Centroid)"

            if zone_type == 'staff':
                status = "ACTIVE" if people_count > 0 else "NOT ACTIVE"
                label = f"{zone_name}: {status}"
            else:
                if people_count == 1:
                    label = f"{zone_name}: {people_count} Person"
                else:
                    label = f"{zone_name}: {people_count} People"

            label2 = f"{type_label} {detection_method}"
            label_pos = polygon[0]

            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
            (label2_w, label2_h), _ = cv2.getTextSize(label2, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)

            cv2.rectangle(frame, (label_pos[0] - 5, label_pos[1] - label_h - 15),
                         (label_pos[0] + max(label_w, label2_w) + 5, label_pos[1] - 5), border_color, -1)
            cv2.putText(frame, label, (label_pos[0], label_pos[1] - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

            cv2.rectangle(frame, (label_pos[0] - 5, label_pos[1] + 5),
                         (label_pos[0] + label2_w + 5, label_pos[1] + label2_h + 10), border_color, -1)
            cv2.putText(frame, label2, (label_pos[0], label_pos[1] + label2_h + 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Draw counting lines
        for line_name, line_info in line_data.items():
            start = line_info['start']
            end = line_info['end']
            cv2.line(frame, start, end, (0, 255, 255), 3)

            mid_x = (start[0] + end[0]) // 2
            mid_y = (start[1] + end[1]) // 2

            in_count = line_info['counts']['in']
            out_count = line_info['counts']['out']

            cv2.rectangle(frame, (mid_x + 10, mid_y - 35), (mid_x + 80, mid_y - 5), (0, 0, 0), -1)
            cv2.putText(frame, f"IN: {in_count}", (mid_x + 15, mid_y - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            cv2.rectangle(frame, (mid_x + 10, mid_y + 5), (mid_x + 100, mid_y + 40), (0, 0, 0), -1)
            cv2.putText(frame, f"OUT: {out_count}", (mid_x + 15, mid_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        # Draw summary panel
        if lines:
            panel_height = 140
            panel_width = 320

            total_in = sum(line_info['counts']['in'] for line_info in line_data.values())
            total_out = sum(line_info['counts']['out'] for line_info in line_data.values())
            total_inside = total_in - total_out

            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (panel_width, panel_height), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

            cv2.putText(frame, f"IN:  {total_in}", (15, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 255, 0), 3)
            cv2.putText(frame, f"OUT: {total_out}", (15, 85), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 255), 3)
            cv2.putText(frame, f"Inside: {total_inside}", (15, 125), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        # Write frame to video
        out.write(frame)
        
        # Update shared frame buffer for live streaming
        if progress_id:
            try:
                # Encode frame to JPEG
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    frame_buffers[progress_id] = buffer.tobytes()
            except Exception as e:
                print(f"Error updating frame buffer: {e}")

    cap.release()
    out.release()
    cv2.destroyAllWindows()
    
    # Clean up frame buffer
    if progress_id and progress_id in frame_buffers:
        del frame_buffers[progress_id]

    print(f"\n✓ Temporary video file written")

    # Finalize timeline data for any remaining intervals
    for zone in zones:
        zone_name = zone.name
        zone_type = zone.type

        if zone_type == 'staff':
            # Add final 5-second interval
            active_value = 1 if staff_zone_active_in_5sec.get(zone_name, False) else 0
            staff_zone_timeline[zone_name].append({
                'time': format_timestamp(int(current_5sec * fps), fps),
                'time_seconds': current_5sec,
                'active': active_value
            })
        else:
            # Add final second
            counts = customer_zone_counts_in_sec.get(zone_name, [0])
            avg_count = sum(counts) / len(counts) if counts else 0
            customer_zone_timeline[zone_name].append({
                'time': format_timestamp(int(current_second * fps), fps),
                'time_seconds': current_second,
                'count': round(avg_count, 1)
            })

    update_progress('converting', 88, 'Converting video to H.264 format...')
    
    # Convert to H.264
    try:
        import subprocess
        print("Converting video to H.264 format...")

        cmd = [
            'imageio-ffmpeg.get_ffmpeg_exe',
            '-y',                          # Overwrite output
            '-r', str(fps),                # Input frame rate
            '-i', temp_output,
            '-c:v', 'libx264',
            '-preset', 'medium',           # Better quality than 'fast'
            '-crf', '18',                  # Lower = better quality (18-23 is good)
            '-r', str(fps),                # Output frame rate (match input)
            '-vsync', 'cfr',               # Constant frame rate - prevents skipping!
            '-movflags', '+faststart',
            '-pix_fmt', 'yuv420p',
            output_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

        if result.returncode == 0:
            print(f"✓ Video converted successfully to smooth MP4")
            if os.path.exists(temp_output):
                os.remove(temp_output)
        else:
            print(f"⚠️ FFmpeg conversion failed, keeping temp file")
            print(f"FFmpeg error: {result.stderr}")
            # Keep the AVI file as fallback (rename to mp4 for compatibility)
            if os.path.exists(temp_output):
                fallback_path = output_path.replace('.mp4', '_raw.avi')
                shutil.move(temp_output, fallback_path)
                print(f"Saved raw video to: {fallback_path}")
    except Exception as e:
        print(f"⚠️ FFmpeg not available or error: {e}")
        if os.path.exists(temp_output):
            fallback_path = output_path.replace('.mp4', '_raw.avi')
            shutil.move(temp_output, fallback_path)
            print(f"Saved raw video to: {fallback_path}")

    # Finalize person trackers
    for tracker in person_trackers.values():
        tracker.finalize()

    # Get line counts
    final_line_counts = {}
    for line_name, line_info in line_data.items():
        final_line_counts[line_name] = {
            'in': int(line_info['counts']['in']),
            'out': int(line_info['counts']['out']),
            'timeline': line_info['timeline']
        }

    # Sort and filter persons
    sorted_persons = sorted(person_trackers.values(), key=lambda x: x.first_seen_frame)
    filtered_persons = [tracker for tracker in sorted_persons if len(tracker.zone_history) > 0]

    # Prepare zone metadata
    zone_metadata = {}
    for zone in zones:
        zone_metadata[zone.name] = {
            'type': zone.type,
            'name': zone.name,
            'timeline': staff_zone_timeline[zone.name] if zone.type == 'staff' else customer_zone_timeline[zone.name]
        }

    tracking_data = {
        'video_info': {
            'total_frames': total_frames,
            'fps': fps,
            'duration': format_timestamp(total_frames, fps)
        },
        'zones': zone_metadata,
        'persons': [tracker.get_summary() for tracker in filtered_persons],
        'summary': {
            'total_persons_detected': len(filtered_persons),
            'total_persons_seen': len(person_trackers),
            'zone_stats': {name: len(ids) for name, ids in zone_ids.items()},
            'line_stats': final_line_counts
        }
    }

    # Save tracking data
    output_name = Path(output_path).stem
    json_path = DATA_FOLDER / f'{output_name}_tracking.json'
    with open(json_path, 'w') as f:
        json.dump(tracking_data, f, indent=2)

    # Save CSV
    csv_path = DATA_FOLDER / f'{output_name}_tracking.csv'
    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Person ID', 'First Seen', 'Last Seen', 'Total Time', 'Zone', 'Entry Time', 'Exit Time', 'Duration'])

        for person in tracking_data['persons']:
            if person['zone_visits']:
                for visit in person['zone_visits']:
                    writer.writerow([
                        person['id'],
                        person['first_seen'],
                        person['last_seen'],
                        person['total_time'],
                        visit['zone'],
                        visit['entry_time'],
                        visit['exit_time'] or 'Still in zone',
                        visit['duration'] or 'N/A'
                    ])

    update_progress('complete', 100, 'Processing complete!')
    
    print("\n" + "=" * 70)
    print("VIDEO PROCESSING COMPLETE")
    print("=" * 70)
    print(f"Total Persons Detected: {len(person_trackers)}")
    for line_name, counts in final_line_counts.items():
        print(f"{line_name}: IN={counts['in']} | OUT={counts['out']}")
    print(f"\nTracking data saved:")
    print(f"  JSON: {json_path}")
    print(f"  CSV:  {csv_path}")
    print("=" * 70)

    # Store results in progress dict for retrieval
    if progress_id:
        processing_progress[progress_id]['stats'] = {
            'zones': {name: list(ids) for name, ids in zone_ids.items()},
            'lines': final_line_counts,
            'total_frames': total_frames,
            'tracking_data': tracking_data,
            'data_files': {
                'json': str(json_path),
                'csv': str(csv_path)
            },
            'output': Path(output_path).name
        }

    return {
        'zones': {name: list(ids) for name, ids in zone_ids.items()},
        'lines': final_line_counts,
        'total_frames': total_frames,
        'tracking_data': tracking_data,
        'data_files': {
            'json': str(json_path),
            'csv': str(csv_path)
        }
    }

@app.get("/")
async def root():
    return FileResponse("templates/index.html")

@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    print(f"📤 Upload received: filename={video.filename}, content_type={video.content_type}")
    
    if not allowed_file(video.filename):
        print(f"❌ Invalid file type: {video.filename}")
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}")

    filename = video.filename
    filepath = UPLOAD_FOLDER / filename

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    cap = cv2.VideoCapture(str(filepath))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    ret, frame = cap.read()
    if ret:
        preview_path = STATIC_FOLDER / 'preview.jpg'
        cv2.imwrite(str(preview_path), frame)
    cap.release()

    return JSONResponse({
        'success': True,
        'filename': filename,
        'width': width,
        'height': height,
        'fps': fps,
        'frames': frame_count,
        'preview': '/static/preview.jpg'
    })

@app.post("/process")
async def process(request: ProcessRequest, background_tasks: BackgroundTasks):
    if not request.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    input_path = UPLOAD_FOLDER / request.filename
    output_filename = f'processed_{request.filename}'
    output_path = OUTPUT_FOLDER / output_filename
    
    # Create a progress ID for tracking
    import hashlib
    progress_id = hashlib.md5(f"{request.filename}_{output_filename}".encode()).hexdigest()[:8]
    
    # Initialize progress
    processing_progress[progress_id] = {
        'stage': 'starting',
        'percent': 0,
        'message': 'Initializing...'
    }

    # Run processing in background
    def run_processing():
        try:
            process_video(str(input_path), request.zones, request.lines, str(output_path), progress_id)
            # Mark as complete in progress dict (process_video updates progress but we ensure complete state here)
            if progress_id in processing_progress:
                processing_progress[progress_id]['stage'] = 'complete'
                processing_progress[progress_id]['percent'] = 100
                processing_progress[progress_id]['message'] = 'Processing complete!'
        except Exception as e:
            print(f"Error processing video: {e}")
            import traceback
            traceback.print_exc()
            
            # Update progress with error
            if progress_id in processing_progress:
                processing_progress[progress_id] = {
                    'stage': 'error',
                    'percent': 0,
                    'message': str(e)
                }

    background_tasks.add_task(run_processing)
            
    return JSONResponse({
        'success': True,
        'progress_id': progress_id,
        'message': 'Processing started in background'
    })

@app.get("/progress/{progress_id}")
async def get_progress(progress_id: str):
    """Get processing progress by ID"""
    if progress_id in processing_progress:
        return JSONResponse(processing_progress[progress_id])
    return JSONResponse({
        'stage': 'unknown',
        'percent': 0,
        'message': 'Progress not found - processing may have completed'
    })

def generate_frames(progress_id: str):
    """Generator function for MJPEG streaming"""
    import time
    while True:
        if progress_id in frame_buffers:
            frame_bytes = frame_buffers[progress_id]
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.03)  # Limit to ~30 FPS
        else:
            # If processing is complete or not found, stop streaming
            if progress_id not in processing_progress or processing_progress[progress_id]['stage'] in ['complete', 'error']:
                break
            time.sleep(0.1)

@app.get("/video_feed/{progress_id}")
async def video_feed(progress_id: str):
    """Stream processed video frames"""
    return StreamingResponse(
        generate_frames(progress_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/download/{filename:path}")
async def download(filename: str, custom_name: Optional[str] = None):
    filepath = OUTPUT_FOLDER / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    download_name = custom_name if custom_name else filename
    if not download_name.endswith('.mp4'):
        download_name += '.mp4'

    return FileResponse(filepath, media_type='video/mp4', filename=download_name)

@app.get("/get-video-url/{filename:path}")
async def get_video_url(filename: str):
    """Get video URL - converts AVI to MP4 on-demand if needed"""
    print(f"📹 Video requested: {filename}")
    
    # Check for MP4 version first
    mp4_path = OUTPUT_FOLDER / filename.replace('_raw.avi', '.mp4').replace('.avi', '.mp4')
    
    if mp4_path.exists():
        print(f"✓ MP4 already exists: {mp4_path.name}")
        file_hash = hashlib.md5(filename.encode()).hexdigest()[:8]
        static_name = f"video_{file_hash}.mp4"
        static_path = STATIC_FOLDER / static_name
        
        if not static_path.exists():
            shutil.copy(mp4_path, static_path)
        
        return JSONResponse({'video_url': f'/static/{static_name}'})
    
    # Check for AVI version
    avi_candidates = [
        OUTPUT_FOLDER / filename,
        OUTPUT_FOLDER / filename.replace('.mp4', '_raw.avi'),
        OUTPUT_FOLDER / filename.replace('.mp4', '.avi')
    ]
    
    avi_path = None
    for candidate in avi_candidates:
        if candidate.exists():
            avi_path = candidate
            break
    
    if not avi_path:
        raise HTTPException(status_code=404, detail=f"Video file not found: {filename}")
    
    # Convert AVI to MP4 on-demand
    print(f"🔄 Converting {avi_path.name} to MP4 (this may take a moment)...")
    
    try:
        ffmpeg_exe = get_ffmpeg_exe()
        
        # Create MP4 filename
        output_mp4 = OUTPUT_FOLDER / avi_path.name.replace('_raw.avi', '.mp4').replace('.avi', '.mp4')
        
        cmd = [
            ffmpeg_exe,
            '-y',                      # Overwrite
            '-i', str(avi_path),       # Input AVI
            '-c:v', 'libx264',         # H.264 codec
            '-preset', 'fast',         # Fast encoding
            '-crf', '23',              # Reasonable quality
            '-movflags', '+faststart', # Web optimization
            '-pix_fmt', 'yuv420p',     # Browser compatibility
            str(output_mp4)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0 and output_mp4.exists():
            print(f"✓ Conversion successful: {output_mp4.name}")
            
            # Copy to static folder
            file_hash = hashlib.md5(filename.encode()).hexdigest()[:8]
            static_name = f"video_{file_hash}.mp4"
            static_path = STATIC_FOLDER / static_name
            shutil.copy(output_mp4, static_path)
            
            return JSONResponse({'video_url': f'/static/{static_name}'})
        else:
            print(f"⚠️ Conversion failed: {result.stderr}")
            # Fall back to serving AVI (won't play in browser but can be downloaded)
            file_hash = hashlib.md5(filename.encode()).hexdigest()[:8]
            static_name = f"video_{file_hash}.avi"
            static_path = STATIC_FOLDER / static_name
            shutil.copy(avi_path, static_path)
            return JSONResponse({'video_url': f'/static/{static_name}'})
            
    except Exception as e:
        print(f"❌ Error during conversion: {e}")
        # Fall back to AVI
        file_hash = hashlib.md5(filename.encode()).hexdigest()[:8]
        static_name = f"video_{file_hash}.avi"
        static_path = STATIC_FOLDER / static_name
        shutil.copy(avi_path, static_path)
        return JSONResponse({'video_url': f'/static/{static_name}'})

@app.get("/history")
async def history_page():
    return FileResponse("templates/history.html")

@app.get("/api/history")
async def get_history():
    history = []

    # Look for both processed_* and temp_processed_* files (MP4 and AVI)
    video_patterns = ['processed_*.mp4', 'temp_processed_*.mp4', 'processed_*_raw.avi', 'temp_processed_*.avi']
    found_files = set()
    
    for pattern in video_patterns:
        for video_file in OUTPUT_FOLDER.glob(pattern):
            # Skip if we already found this video (avoid duplicates between mp4 and avi)
            base_check = video_file.stem.replace('_raw', '')
            if base_check in [f.replace('_raw', '') for f in found_files]:
                continue
                
            found_files.add(video_file.stem)
            
            video_name = video_file.name
            # Handle both naming conventions and extensions
            base_name = video_name.replace('temp_processed_', '').replace('processed_', '').replace('_raw', '').rsplit('.', 1)[0]

            # Check for tracking data with both possible naming conventions
            json_path = DATA_FOLDER / f'processed_{base_name}_tracking.json'
            if not json_path.exists():
                json_path = DATA_FOLDER / f'temp_processed_{base_name}_tracking.json'

            if json_path.exists():
                try:
                    with open(json_path, 'r') as f:
                        tracking_data = json.load(f)

                    history.append({
                        'filename': video_name,
                        'original_name': f'{base_name}.mp4',
                        'processed_date': video_file.stat().st_mtime,
                        'total_persons': tracking_data['summary']['total_persons_detected'],
                        'duration': tracking_data['video_info']['duration'],
                        'zones': list(tracking_data['zones'].keys()),
                        'has_data': True
                    })
                except Exception as e:
                    print(f"Error reading tracking data for {video_name}: {e}")
                    history.append({
                        'filename': video_name,
                        'original_name': f'{base_name}.mp4',
                        'processed_date': video_file.stat().st_mtime,
                        'has_data': False
                    })
            else:
                history.append({
                    'filename': video_name,
                    'original_name': f'{base_name}.mp4',
                    'processed_date': video_file.stat().st_mtime,
                    'has_data': False
                })

    history.sort(key=lambda x: x['processed_date'], reverse=True)
    
    print(f"📋 History: Found {len(history)} videos")
    for video in history:
        print(f"  - {video['filename']} -> base: {video.get('base_name', 'unknown')}")

    return JSONResponse({'videos': history})

@app.delete("/delete/{filename:path}")
async def delete_video(filename: str):
    """Delete a processed video and its associated data"""
    try:
        # Delete video file
        video_path = OUTPUT_FOLDER / filename
        if video_path.exists():
            video_path.unlink()
            print(f"🗑️ Deleted video: {filename}")
        
        # Delete tracking data
        base_name = filename.replace('temp_processed_', '').replace('processed_', '').replace('_raw', '').rsplit('.', 1)[0]
        
        # Try deleting JSON files
        for prefix in ['processed_', 'temp_processed_']:
            json_path = DATA_FOLDER / f'{prefix}{base_name}_tracking.json'
            if json_path.exists():
                json_path.unlink()
                print(f"🗑️ Deleted JSON: {json_path.name}")
            
            csv_path = DATA_FOLDER / f'{prefix}{base_name}_tracking.csv'
            if csv_path.exists():
                csv_path.unlink()
                print(f"🗑️ Deleted CSV: {csv_path.name}")
        
        return JSONResponse({'success': True, 'message': f'Deleted {filename}'})
    except Exception as e:
        print(f"❌ Error deleting {filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard/{filename:path}")
async def dashboard(filename: str):
    return FileResponse("templates/dashboard.html")

@app.get("/tracking-data/{filename:path}")
async def get_tracking_data(filename: str):
    base_name = filename.replace('temp_processed_', '').replace('processed_', '').replace('_raw', '').rsplit('.', 1)[0]
    
    # Try both naming conventions
    json_path = DATA_FOLDER / f'processed_{base_name}_tracking.json'
    if not json_path.exists():
        json_path = DATA_FOLDER / f'temp_processed_{base_name}_tracking.json'

    if not json_path.exists():
        raise HTTPException(status_code=404, detail=f"Tracking data not found for {filename}")

    with open(json_path, 'r') as f:
        data = json.load(f)

    return JSONResponse(data)

@app.get("/download-csv/{filename:path}")
async def download_csv(filename: str, custom_name: Optional[str] = None):
    base_name = filename.replace('temp_processed_', '').replace('processed_', '').replace('_raw', '').rsplit('.', 1)[0]
    
    # Try both naming conventions
    csv_path = DATA_FOLDER / f'processed_{base_name}_tracking.csv'
    if not csv_path.exists():
        csv_path = DATA_FOLDER / f'temp_processed_{base_name}_tracking.csv'

    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")

    download_name = custom_name if custom_name else f'{base_name}_tracking.csv'
    if not download_name.endswith('.csv'):
        download_name += '.csv'

    return FileResponse(csv_path, media_type='text/csv', filename=download_name)

@app.get("/download-json/{filename:path}")
async def download_json(filename: str, custom_name: Optional[str] = None):
    base_name = filename.replace('temp_processed_', '').replace('processed_', '').rsplit('.', 1)[0]
    
    # Try both naming conventions
    json_path = DATA_FOLDER / f'processed_{base_name}_tracking.json'
    if not json_path.exists():
        json_path = DATA_FOLDER / f'temp_processed_{base_name}_tracking.json'

    if not json_path.exists():
        raise HTTPException(status_code=404, detail="JSON file not found")

    download_name = custom_name if custom_name else f'{base_name}_tracking.json'
    if not download_name.endswith('.json'):
        download_name += '.json'

    return FileResponse(json_path, media_type='application/json', filename=download_name)

if __name__ == '__main__':
    import uvicorn
    print("\n" + "="*60)
    print("🚀 Person Detection & Tracking Application (app2.py - fine.py detection)")
    print("="*60)
    print("📍 Access the application at:")
    print("   → http://localhost:8002")
    print("   → http://127.0.0.1:8002")
    print("="*60 + "\n")
    uvicorn.run(app, host='0.0.0.0', port=8002)

