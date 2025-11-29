# Person Detection - Zone & Line Counting (Detection Only)

A web-based person detection application using YOLO11n for **frame-by-frame detection** without tracking. This simplified version provides accurate detection counts for zones and line crossings without maintaining individual person IDs.

## Key Features

### Detection (No Tracking)
- ✅ **Pure YOLO11n Detection** - No ByteTrack/BoT-SORT tracking
- ✅ **Frame-by-Frame Analysis** - Each frame analyzed independently
- ✅ **High Detection Accuracy** - Uses YOLO11n's excellent detection capabilities
- ✅ **No ID Management** - Simplified logic, no tracking IDs

### Zone Detection
- **Two Zone Types:**
  - **Staff Zones** - Centroid-based detection (ACTIVE/NOT ACTIVE status)
  - **Customer Zones** - Bounding box overlap detection (people count)
- **Configurable Overlap Threshold** - Default 20% for customer zones
- **Visual Annotations** - Color-coded zones with real-time counts

### Line Counting
- **Directional Counting** - IN/OUT crossing detection
- **Cross Product Algorithm** - Geometric line crossing detection
- **Visual Feedback** - Yellow counting lines with IN/OUT labels

### Web Interface
- **Upload Page** - Drag-and-drop video upload
- **Interactive Drawing** - Click to draw zones and lines on video preview
- **History Browser** - View all processed videos
- **Analytics Dashboard** - Charts and statistics
- **Data Export** - CSV and JSON export

## Quick Start

### Prerequisites
- Python 3.8+
- FFmpeg (for video conversion)
- Webcam or video files (mp4, avi, mov, mkv)

### Installation

1. **Navigate to project folder:**
```bash
cd "C:\Users\Asustuf\Desktop\Original\yolov11n"
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

### Running the Application

```bash
python app.py
```

Then open your browser to:
- **http://localhost:8002**
- **http://127.0.0.1:8002**

## How to Use

### 1. Upload Video
- Click "Upload Video" or drag-and-drop a video file
- Supported formats: MP4, AVI, MOV, MKV
- Max size: 500MB

### 2. Draw Zones
- **Staff Zone** (Centroid-based):
  1. Select "Staff" zone type
  2. Enter zone name
  3. Click "Start Drawing Zone"
  4. Click points on canvas to create polygon
  5. Click "Finish Polygon" or right-click when done

- **Customer Zone** (Overlap-based):
  1. Select "Customer" zone type
  2. Enter zone name
  3. Click "Start Drawing Zone"
  4. Click points on canvas
  5. Click "Finish Polygon" or right-click when done

### 3. Draw Counting Lines
1. Enter line name
2. Click "Add Counting Line"
3. Click two points on canvas (start and end)

### 4. Process Video
1. Click "Process Video"
2. Wait for processing (progress shown in console)
3. Automatically redirected to dashboard

### 5. View Analytics
- **Statistics Cards** - Avg detections, duration, zone counts, line counts
- **Video Player** - Watch processed video with annotations
- **Charts** - Detection timeline charts
- **Data Export** - Download CSV or JSON

## Detection vs Tracking

### This Application (Detection Only)

**How it works:**
```
Frame 1: Detect 5 people → Count: 5
Frame 2: Detect 4 people → Count: 4
Frame 3: Detect 6 people → Count: 6
```

**Advantages:**
- ✅ Simpler logic
- ✅ Faster processing
- ✅ No ID switching issues
- ✅ More accurate detection
- ✅ Better for crowded scenes

**Disadvantages:**
- ❌ No individual person tracking
- ❌ No timeline per person
- ❌ Can't track person duration in zones
- ❌ Line crossings counted multiple times if person lingers

### Tracking Version (8thproblem)

**How it works:**
```
Frame 1: Person ID 1 appears → Track
Frame 2: Person ID 1 moves → Update
Frame 3: Person ID 1 + ID 2 → Track both
```

**Advantages:**
- ✅ Individual person timelines
- ✅ Entry/exit tracking per person
- ✅ Duration in zones per person
- ✅ One-time line crossing per person

**Disadvantages:**
- ❌ ID switching issues
- ❌ Loses IDs during occlusions
- ❌ Complex threshold tuning
- ❌ May miss people in background

## Configuration

### Detection Threshold
```python
# app.py line ~200
conf=0.4    # Detection confidence (40%)
```

Lower = more detections (including background)
Higher = fewer detections (only confident ones)

### Zone Overlap Threshold
```python
# app.py line ~48
CUSTOMER_ZONE_OVERLAP_THRESHOLD = 0.20  # 20%
```

Percentage of bounding box that must overlap with zone to count.

### Line Crossing Distance
```python
# app.py line ~233
line_offset = 15
max_distance = 45  # 3 × line_offset
```

Maximum distance from line to count as crossing.

## Data Export Formats

### CSV Format
```csv
Frame,Timestamp,Total_Detections,Zone1_Count,Zone2_Count,Line1_IN,Line1_OUT
1,00:00,5,2,3,0,0
2,00:00,6,3,3,0,0
3,00:01,5,2,3,1,0
```

### JSON Format
```json
{
  "video_info": {
    "total_frames": 1500,
    "fps": 30,
    "duration": "00:50"
  },
  "zones": {
    "Customer Zone": {"type": "customer", "name": "Customer Zone"}
  },
  "frames": [
    {
      "frame_number": 1,
      "timestamp": "00:00",
      "total_detections": 5,
      "zone_counts": {"Customer Zone": 3},
      "line_counts": {"Entrance": {"in": 0, "out": 0}}
    }
  ],
  "summary": {
    "total_detections": 7500,
    "avg_detections_per_frame": 5.0,
    "max_detections_per_frame": 12,
    "zone_total_detections": {"Customer Zone": 4500},
    "line_stats": {"Entrance": {"in": 150, "out": 145}}
  }
}
```

## API Endpoints

### Upload & Processing
- `POST /upload` - Upload video file
- `POST /process` - Process video with zones/lines

### Data Retrieval
- `GET /api/history` - List all processed videos
- `GET /detection-data/{filename}` - Get detection data for video

### File Downloads
- `GET /download/{filename}` - Download processed video
- `GET /download-csv/{filename}` - Download CSV export
- `GET /download-json/{filename}` - Download JSON export

### Pages
- `GET /` - Upload page
- `GET /history` - History browser
- `GET /dashboard/{filename}` - Analytics dashboard

## Folder Structure

```
yolov11n/
├── app.py                  # Main application
├── requirements.txt        # Dependencies
├── README.md              # This file
│
├── templates/             # HTML templates
│   ├── index.html         # Upload page
│   ├── history.html       # History browser
│   └── dashboard.html     # Analytics dashboard
│
├── static/                # Static files (preview images, videos)
├── uploads/               # Uploaded videos (temporary)
├── outputs/               # Processed videos with annotations
└── data/                  # Detection data (JSON/CSV)
```

## Algorithms Used

### 1. Zone Detection

**Staff Zone (Centroid-based):**
```python
centroid = ((x1 + x2) / 2, (y1 + y2) / 2)
if point_in_polygon(centroid, zone_polygon):
    zone_active = True
```

**Customer Zone (Overlap-based):**
```python
overlap = calculate_bbox_zone_overlap(bbox, zone_polygon)
if overlap >= 0.20:  # 20% threshold
    person_count += 1
```

### 2. Line Crossing

**Cross Product Algorithm:**
```python
side = (x2 - x1) * (y0 - y1) - (y2 - y1) * (x0 - x1)
if old_side * new_side < 0:  # Sign changed = crossed
    if old_side > 0 and new_side < 0:
        direction = "IN"
    else:
        direction = "OUT"
```

## Troubleshooting

### Video not processing
- Check FFmpeg is installed
- Ensure video format is supported
- Check file size < 500MB

### Low detection accuracy
- Increase confidence threshold (conf=0.4 → 0.5)
- Ensure good lighting in video
- Check video resolution

### Too many false detections
- Increase confidence threshold
- Adjust zone overlap threshold
- Check zone placement

### Line crossings not counted
- Increase line crossing distance (line_offset)
- Check line placement
- Verify detections are close to line

## Comparison with 8thproblem

| Feature | yolov11n (This) | 8thproblem |
|---------|----------------|------------|
| **Method** | Detection only | Tracking (BoT-SORT) |
| **IDs** | None | Sequential (1, 2, 3...) |
| **Person Timeline** | No | Yes |
| **Zone Entry/Exit** | Per frame count | Per person tracking |
| **Line Crossing** | All crossings | One per person |
| **Background Detection** | ✅ Excellent | ⚠️ May miss |
| **Complexity** | Low | High |
| **Processing Speed** | Faster | Slower |
| **Best For** | Crowd counting | Individual tracking |

## Credits

- **YOLO11n** - Ultralytics
- **OpenCV** - Video processing
- **FastAPI** - Web framework
- **Chart.js** - Data visualization

## License

This project is for educational and research purposes.

## Support

For issues or questions, check the console output for error messages. Common issues:
- FFmpeg not installed → Install from https://ffmpeg.org/
- CUDA errors → CPU mode is automatic fallback
- Port 8002 in use → Change port in app.py line ~1003

---

**Built with YOLO11n - Detection Excellence without Tracking Complexity**
