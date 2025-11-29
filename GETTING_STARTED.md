# Getting Started - Person Detection Application

## What You Have

A complete web-based person detection application located at:
```
C:\Users\Suggala Sai Preetham\Desktop\Original\yolov11n\
```

## Key Difference from 8thproblem

| Feature | yolov11n (This Folder) | 8thproblem |
|---------|----------------------|------------|
| **Detection Mode** | YOLO11n Detection Only | YOLO11n + BoT-SORT Tracking |
| **Tracking IDs** | ❌ None | ✅ Yes (1, 2, 3...) |
| **Person Timelines** | ❌ No | ✅ Yes |
| **Background People** | ✅✅ Excellent | ⚠️ May miss |
| **Complexity** | Simple | Complex |
| **Best For** | Crowd counting, accurate detection | Individual tracking |

## Quick Start (3 Steps)

### Step 1: Install Dependencies

**Option A: Use shared venv from Original folder**
```bash
cd "C:\Users\Suggala Sai Preetham\Desktop\Original\yolov11n"
..\venv\Scripts\activate
```

**Option B: Create new venv**
```bash
cd "C:\Users\Suggala Sai Preetham\Desktop\Original\yolov11n"
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Start the Application

**Option A: Double-click START.bat**
```
Just double-click START.bat in the yolov11n folder
```

**Option B: Run from command line**
```bash
python app.py
```

### Step 3: Open in Browser
```
http://localhost:8002
```

## First Time Use

### 1. Upload a Video
- Click "Upload Video" or drag-and-drop
- Wait for preview to load

### 2. Draw Zones (Optional)
- **Customer Zone** (counts people with body overlap):
  - Select "Customer" type
  - Enter name (e.g., "Checkout Area")
  - Click "Start Drawing Zone"
  - Click points on preview to create polygon
  - Right-click or click "Finish Polygon"

- **Staff Zone** (detects if anyone present):
  - Select "Staff" type
  - Enter name (e.g., "Staff Room")
  - Click "Start Drawing Zone"
  - Click points, then finish

### 3. Draw Counting Lines (Optional)
- Enter line name (e.g., "Entrance")
- Click "Add Counting Line"
- Click start point, then end point on preview

### 4. Process
- Click "🚀 Process Video"
- Wait for processing (console shows progress)
- Auto-redirect to dashboard

### 5. View Results
- **Video Player**: Watch annotated video
- **Statistics**: Avg detections, zone counts, line counts
- **Export**: Download CSV or JSON data

## Example Use Cases

### Scenario 1: Retail Store Foot Traffic
```
Goal: Count people entering/exiting store

Setup:
1. Upload store security camera footage
2. Draw line at entrance/exit
3. Process video
4. View IN/OUT counts in dashboard
```

### Scenario 2: Queue Management
```
Goal: Measure queue occupancy over time

Setup:
1. Upload checkout camera footage
2. Draw Customer Zone around queue area
3. Process video
4. View zone occupancy timeline chart
```

### Scenario 3: Staff Presence Monitoring
```
Goal: Check if staff present in restricted area

Setup:
1. Upload area camera footage
2. Draw Staff Zone in the area
3. Process video
4. View ACTIVE/NOT ACTIVE timeline
```

## Output Files

After processing, you'll find:

### 1. Processed Video
```
outputs/processed_{your_video_name}.mp4
```
- Annotated with bounding boxes
- Zone overlays
- Line crossings
- Detection counts

### 2. JSON Data
```
data/processed_{your_video_name}_detection.json
```
Contains:
- Frame-by-frame detections
- Zone counts per frame
- Line crossing counts
- Summary statistics

### 3. CSV Data
```
data/processed_{your_video_name}_detection.csv
```
Spreadsheet with columns:
- Frame number
- Timestamp
- Total detections
- Zone counts
- Line crossings (IN/OUT)

## Understanding the Output

### Detection Count
```
Frame 1: 5 detections
Frame 2: 4 detections
Frame 3: 6 detections

Avg: 5.0 detections per frame
Max: 6 detections in a single frame
```

**Note:** Same person detected in multiple frames counts multiple times (no tracking).

### Zone Detection

**Customer Zone:**
```
Frame 1: 3 people in zone
Frame 2: 2 people in zone
Frame 3: 4 people in zone

Total: 9 detections across all frames
```

**Staff Zone:**
```
Frame 1: ACTIVE (someone present)
Frame 2: NOT ACTIVE (empty)
Frame 3: ACTIVE (someone present)
```

### Line Crossing

```
Simple crossing detection:
- Person crosses IN → Count increments
- Person crosses OUT → Count increments

Note: Same person can be counted multiple times if they cross back and forth
```

## Common Questions

### Q: Why no person IDs?
**A:** This app uses detection-only mode for maximum accuracy. It doesn't track individuals, just counts detections per frame.

### Q: Can I track individual people?
**A:** Use the `8thproblem` folder for that. It has BoT-SORT tracking with person IDs and timelines.

### Q: Which is better - detection or tracking?
**A:**
- **Detection (yolov11n):** Better for crowd counting, background detection
- **Tracking (8thproblem):** Better for following individuals, entry/exit times

### Q: Why are line counts high?
**A:** Without tracking, each crossing counts. If someone lingers near the line, they may be counted multiple times.

### Q: Can I use both apps?
**A:** Yes! They run on different ports:
- yolov11n: http://localhost:8002
- 8thproblem: http://localhost:8001

## Troubleshooting

### Issue: Import errors
**Solution:**
```bash
# Activate venv first
..\venv\Scripts\activate
# Then run
python app.py
```

### Issue: Port 8002 already in use
**Solution:** Edit app.py line 998, change:
```python
uvicorn.run(app, host='0.0.0.0', port=8002)
```
to a different port like 8003.

### Issue: Video not converting
**Solution:** Install FFmpeg from https://ffmpeg.org/download.html

### Issue: Low detection accuracy
**Solution:** Edit app.py line ~200:
```python
conf=0.4  # Change to 0.5 for higher confidence
```

## Next Steps

1. ✅ Try processing a sample video
2. ✅ Compare output with 8thproblem (tracking version)
3. ✅ Export CSV data for analysis in Excel
4. ✅ Adjust detection thresholds if needed
5. ✅ Test different zone types (staff vs customer)

## Support

- **README.md** - Full documentation
- **Console output** - Error messages and progress
- **8thproblem folder** - Tracking version for comparison

---

**You're all set! Just run `python app.py` or double-click `START.bat`** 🚀
