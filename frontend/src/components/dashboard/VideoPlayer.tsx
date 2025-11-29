'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { Play, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  filename: string;
}

export function VideoPlayer({ filename }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVideo();
  }, [filename]);

  const loadVideo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getVideoUrl(filename);
      setVideoUrl(`http://localhost:8002${data.video_url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-600" />
          Processed Video
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Spinner size="lg" className="border-white/30 border-t-white" />
              <p className="text-white/70 mt-4">Loading video...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-white font-medium">Failed to load video</p>
              <p className="text-white/60 text-sm mt-1">{error}</p>
              <button
                onClick={loadVideo}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full h-full"
              preload="auto"
            >
              Your browser does not support video playback.
            </video>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
