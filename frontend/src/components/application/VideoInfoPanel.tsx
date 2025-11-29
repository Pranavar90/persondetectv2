'use client';

import { VideoUploadInfo } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Film, Clock, Maximize2, Activity } from 'lucide-react';

interface VideoInfoPanelProps {
  videoInfo: VideoUploadInfo | null;
}

export function VideoInfoPanel({ videoInfo }: VideoInfoPanelProps) {
  if (!videoInfo) return null;

  const stats = [
    { icon: Maximize2, label: 'Resolution', value: `${videoInfo.width}x${videoInfo.height}` },
    { icon: Activity, label: 'FPS', value: videoInfo.fps.toString() },
    { icon: Clock, label: 'Frames', value: videoInfo.frames.toLocaleString() },
    { icon: Film, label: 'File', value: videoInfo.filename },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Film className="w-4 h-4 text-blue-600" />
          Video Information
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

