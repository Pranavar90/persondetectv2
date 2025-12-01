// Point coordinates (normalized 0-1)
export interface Point {
  x: number;
  y: number;
}

// Zone definition
export interface Zone {
  name: string;
  type: 'staff' | 'customer';
  points: Point[];
  color: number[];
}

// Line definition
export interface Line {
  name: string;
  start: Point;
  end: Point;
  color: number[];
}

// Video info from upload
export interface VideoUploadInfo {
  success: boolean;
  filename: string;
  width: number;
  height: number;
  fps: number;
  frames: number;
  preview: string;
}

// Video info from tracking data
export interface VideoInfo {
  total_frames: number;
  fps: number;
  duration: string;
}

// Zone visit by a person
export interface ZoneVisit {
  zone: string;
  entry_frame: number;
  entry_time: string;
  exit_frame: number | null;
  exit_time: string | null;
  duration: string | null;
}

// Line crossing event
export interface LineCrossing {
  line: string;
  direction: 'in' | 'out';
  frame: number;
  time: string;
}

// Person tracking data
export interface PersonData {
  id: number;
  first_seen: string;
  last_seen: string;
  total_time: string;
  zone_visits: ZoneVisit[];
  line_crossings: LineCrossing[];
  total_zone_visits: number;
  total_line_crossings: number;
}

// Timeline point for zones
export interface TimelinePoint {
  time: string;
  time_seconds: number;
  active?: number; // For staff zones
  count?: number;  // For customer zones
}

// Timeline point for lines
export interface LineTimelinePoint {
  time: string;
  time_seconds: number;
  in_count: number;
  out_count: number;
}

// Zone metadata
export interface ZoneMetadata {
  type: 'staff' | 'customer';
  name: string;
  timeline: TimelinePoint[];
}

// Line statistics
export interface LineStats {
  in: number;
  out: number;
  timeline: LineTimelinePoint[];
}

// Summary statistics
export interface Summary {
  total_persons_detected: number;
  total_persons_seen: number;
  zone_stats: Record<string, number>;
  line_stats: Record<string, LineStats>;
}

// Complete tracking data
export interface TrackingData {
  video_info: VideoInfo;
  zones: Record<string, ZoneMetadata>;
  persons: PersonData[];
  summary: Summary;
}

// History video item
export interface HistoryVideo {
  filename: string;
  original_name: string;
  processed_date: number;
  total_persons?: number;
  duration?: string;
  zones?: string[];
  has_data: boolean;
  video_url?: string;
}

// Process request
export interface ProcessRequest {
  filename: string;
  zones: Zone[];
  lines: Line[];
}

// Process response
// Process response
export interface ProcessResponse {
  success: boolean;
  progress_id: string;
  message: string;
}

