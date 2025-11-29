'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '@/components/ui';
import { VideoUploader } from '@/components/application/VideoUploader';
import { ZoneDrawingCanvas } from '@/components/application/ZoneDrawingCanvas';
import { ZoneList } from '@/components/application/ZoneList';
import { LineList } from '@/components/application/LineList';
import { VideoInfoPanel } from '@/components/application/VideoInfoPanel';
import { Header } from '@/components/layout/Header';
import { Zone, Line, Point, VideoUploadInfo } from '@/types';
import { api } from '@/lib/api';
import { getRandomColor } from '@/lib/utils';
import {
  Upload,
  MapPin,
  ArrowLeftRight,
  Play,
  Trash2,
  CheckCircle,
  Loader2,
  Brain,
  Video,
  Sparkles
} from 'lucide-react';

// Progress stage icons and colors
const stageConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  starting: { icon: <Sparkles className="w-5 h-5" />, color: 'text-blue-500', label: 'Starting' },
  loading: { icon: <Brain className="w-5 h-5" />, color: 'text-purple-500', label: 'Loading AI Model' },
  processing: { icon: <Video className="w-5 h-5" />, color: 'text-blue-500', label: 'Processing Frames' },
  converting: { icon: <Video className="w-5 h-5" />, color: 'text-amber-500', label: 'Converting Video' },
  complete: { icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-500', label: 'Complete' },
  error: { icon: <Loader2 className="w-5 h-5" />, color: 'text-red-500', label: 'Error' },
};

export default function ApplicationPage() {
  const router = useRouter();

  // Video state
  const [videoInfo, setVideoInfo] = useState<VideoUploadInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Zone/Line state
  const [zones, setZones] = useState<Zone[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [currentLine, setCurrentLine] = useState<Line | null>(null);
  const [drawingMode, setDrawingMode] = useState<'zone' | 'line' | null>(null);

  // Form state
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState<'staff' | 'customer'>('customer');
  const [lineName, setLineName] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('starting');
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up progress polling on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Handle video upload complete
  const handleUploadComplete = useCallback((data: VideoUploadInfo) => {
    setVideoInfo(data);
    setPreviewUrl(`http://localhost:8002${data.preview}?t=${Date.now()}`);
  }, []);

  // Start drawing zone
  const handleStartZone = () => {
    const name = zoneName || `Zone ${zones.length + 1}`;
    setCurrentZone({
      name,
      type: zoneType,
      points: [],
      color: getRandomColor(),
    });
    setDrawingMode('zone');
    setZoneName('');
  };

  // Finish zone drawing
  const handleFinishZone = () => {
    if (currentZone && currentZone.points.length >= 3) {
      setZones([...zones, currentZone]);
      setCurrentZone(null);
      setDrawingMode(null);
    }
  };

  // Start drawing line
  const handleStartLine = () => {
    const name = lineName || `Line ${lines.length + 1}`;
    setCurrentLine({
      name,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      color: getRandomColor(),
    });
    setDrawingMode('line');
    setLineName('');
  };

  // Handle canvas click
  const handleCanvasClick = (point: Point) => {
    if (drawingMode === 'zone' && currentZone) {
      setCurrentZone({
        ...currentZone,
        points: [...currentZone.points, point],
      });
    } else if (drawingMode === 'line' && currentLine) {
      if (!currentLine.start.x && !currentLine.start.y) {
        setCurrentLine({
          ...currentLine,
          start: point,
        });
      } else {
        setLines([...lines, { ...currentLine, end: point }]);
        setCurrentLine(null);
        setDrawingMode(null);
      }
    }
  };

  // Handle right click (finish zone)
  const handleCanvasRightClick = () => {
    if (drawingMode === 'zone' && currentZone && currentZone.points.length >= 3) {
      handleFinishZone();
    }
  };

  // Delete zone
  const handleDeleteZone = (index: number) => {
    setZones(zones.filter((_, i) => i !== index));
  };

  // Delete line
  const handleDeleteLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Clear all
  const handleClearAll = () => {
    setZones([]);
    setLines([]);
    setCurrentZone(null);
    setCurrentLine(null);
    setDrawingMode(null);
  };

  // Poll for processing progress
  const startProgressPolling = (progressId: string) => {
    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8002/progress/${progressId}`);
        const data = await response.json();

        setProcessingProgress(data.percent || 0);
        setProcessingStage(data.stage || 'processing');
        setProcessingStatus(data.message || 'Processing...');

        if (data.stage === 'complete') {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          // Redirect using stats from progress data
          if (data.stats && data.stats.output) {
            setTimeout(() => {
              router.push(`/dashboard/${encodeURIComponent(data.stats.output)}`);
            }, 1500);
          }
        } else if (data.stage === 'error') {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 500);
  };

  // Process video
  const handleProcess = async () => {
    if (!videoInfo) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStage('starting');
    setProcessingStatus('Initializing AI processing...');

    try {
      // Call API first to start background task
      const result = await api.processVideo(videoInfo.filename, zones, lines);

      if (result.success && result.progress_id) {
        const progressId = result.progress_id;

        // Set live stream URL
        setPreviewUrl(`http://localhost:8002/video_feed/${progressId}`);

        // Start polling
        startProgressPolling(progressId);
      }
    } catch (error) {
      setProcessingStage('error');
      setProcessingStatus(`Error: ${error instanceof Error ? error.message : 'Processing failed'}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Applications"
        subtitle="Create and configure video analytics applications"
      />

      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="col-span-3 space-y-4">
            {/* Upload Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Upload Video
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <VideoUploader onUploadComplete={handleUploadComplete} />
              </CardContent>
            </Card>

            {/* Video Info */}
            <VideoInfoPanel videoInfo={videoInfo} />

            {/* Zones Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Zones
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Select
                  label="Zone Type"
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value as 'staff' | 'customer')}
                  options={[
                    { value: 'customer', label: '👥 Customer Zone' },
                    { value: 'staff', label: '👔 Staff Zone' },
                  ]}
                />
                <Input
                  placeholder="Zone name"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  disabled={!!drawingMode}
                />
                {drawingMode === 'zone' ? (
                  <Button
                    variant="success"
                    className="w-full"
                    onClick={handleFinishZone}
                    disabled={!currentZone || currentZone.points.length < 3}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Finish Zone ({currentZone?.points.length || 0} points)
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleStartZone}
                    disabled={!videoInfo || drawingMode === 'line'}
                  >
                    <MapPin className="w-4 h-4" />
                    Start Drawing Zone
                  </Button>
                )}
                <ZoneList zones={zones} onDelete={handleDeleteZone} />
              </CardContent>
            </Card>

            {/* Lines Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                  Counting Lines
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Input
                  placeholder="Line name"
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                  disabled={!!drawingMode}
                />
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleStartLine}
                  disabled={!videoInfo || drawingMode === 'zone'}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Add Counting Line
                </Button>
                <LineList lines={lines} onDelete={handleDeleteLine} />
              </CardContent>
            </Card>
          </div>

          {/* Main Canvas Area */}
          <div className="col-span-6">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Video Preview & Zone Drawing</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-center min-h-[500px]">
                <ZoneDrawingCanvas
                  imageUrl={previewUrl}
                  zones={zones}
                  lines={lines}
                  currentZone={currentZone}
                  currentLine={currentLine}
                  drawingMode={drawingMode}
                  onCanvasClick={handleCanvasClick}
                  onCanvasRightClick={handleCanvasRightClick}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Actions & Status */}
          <div className="col-span-3 space-y-4">
            {/* Action Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Button
                  variant="success"
                  className="w-full"
                  onClick={handleProcess}
                  disabled={!videoInfo || isProcessing}
                  isLoading={isProcessing}
                >
                  {isProcessing ? (
                    processingStatus
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Process Video
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleClearAll}
                  disabled={isProcessing}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Instructions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Upload a video file (MP4, AVI, MOV)</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Draw zones by clicking points on the video (min 3 points)</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Right-click or click &quot;Finish Zone&quot; to complete</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600">4.</span>
                    <span>Add counting lines by clicking start and end points</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600">5.</span>
                    <span>Click &quot;Process Video&quot; to analyze</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Processing Status */}
            {isProcessing && (
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="py-6">
                  <div className="flex flex-col items-center text-center">
                    {/* Stage Icon */}
                    <div className={`mb-4 ${processingStage === 'complete' ? '' : 'animate-pulse'}`}>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${processingStage === 'complete'
                          ? 'bg-emerald-100'
                          : processingStage === 'error'
                            ? 'bg-red-100'
                            : 'bg-blue-100'
                        }`}>
                        {processingStage === 'complete' ? (
                          <CheckCircle className="w-8 h-8 text-emerald-600" />
                        ) : processingStage === 'error' ? (
                          <span className="text-2xl">❌</span>
                        ) : (
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        )}
                      </div>
                    </div>

                    {/* Stage Label */}
                    <p className={`font-semibold text-lg ${processingStage === 'complete'
                        ? 'text-emerald-700'
                        : processingStage === 'error'
                          ? 'text-red-700'
                          : 'text-blue-900'
                      }`}>
                      {stageConfig[processingStage]?.label || 'Processing'}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full mt-4 mb-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{processingStatus}</span>
                        <span className="font-semibold">{processingProgress}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${processingStage === 'complete'
                              ? 'bg-emerald-500'
                              : processingStage === 'error'
                                ? 'bg-red-500'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            }`}
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stage Steps */}
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs">
                      {['loading', 'processing', 'converting', 'complete'].map((stage, index) => (
                        <div key={stage} className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${processingStage === stage
                              ? 'bg-blue-600 animate-pulse'
                              : ['loading', 'processing', 'converting', 'complete'].indexOf(processingStage) >= index
                                ? 'bg-emerald-500'
                                : 'bg-gray-300'
                            }`} />
                          {index < 3 && (
                            <div className={`w-8 h-0.5 ${['loading', 'processing', 'converting', 'complete'].indexOf(processingStage) > index
                                ? 'bg-emerald-500'
                                : 'bg-gray-300'
                              }`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Load</span>
                      <span>Process</span>
                      <span>Convert</span>
                      <span>Done</span>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Processing time depends on video length and system resources
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
