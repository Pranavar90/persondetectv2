'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HistoryVideo } from '@/types';
import { Badge, Button } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { Play, Download, Clock, Users, MapPin, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface VideoCardProps {
  video: HistoryVideo;
  onDelete?: () => void;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `http://localhost:8002/download/${encodeURIComponent(video.filename)}`;
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${video.original_name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteVideo(video.filename);
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      alert(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Link href={`/dashboard/${encodeURIComponent(video.filename)}`}>
      <div className="video-card group cursor-pointer">
        {/* Header with status */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-medium text-gray-900 truncate flex-1 mr-2">
            {video.original_name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Processed</span>
            <div className="status-online" />
          </div>
        </div>

        {/* Video Thumbnail / Preview Area */}
        <div className="relative aspect-video bg-gray-900 overflow-hidden">
          {video.video_url ? (
            <>
              {/* Video thumbnail */}
              <video
                src={`http://localhost:8002${video.video_url}`}
                className="absolute inset-0 w-full h-full object-cover"
                preload="metadata"
                muted
                playsInline
                onError={(e) => {
                  // Fallback to placeholder on error
                  e.currentTarget.style.display = 'none';
                  const placeholder = e.currentTarget.nextElementSibling;
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              {/* Fallback placeholder (hidden by default) */}
              <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center">
                  <Play className="w-12 h-12 text-white/30 mx-auto mb-2" />
                  <span className="text-white/50 text-sm">Click to view analytics</span>
                </div>
              </div>
            </>
          ) : (
            /* Placeholder for videos without URL */
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-center">
                <Play className="w-12 h-12 text-white/30 mx-auto mb-2" />
                <span className="text-white/50 text-sm">Click to view analytics</span>
              </div>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-all duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-white rounded-full p-3 shadow-lg">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Duration badge */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {video.duration}
            </div>
          )}
        </div>

        {/* Stats */}
        {video.has_data ? (
          <div className="p-4 space-y-3">
            {/* Date */}
            <div className="text-xs text-gray-500">
              {formatDate(video.processed_date)}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4">
              {video.total_persons !== undefined && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{video.total_persons}</span>
                  <span className="text-gray-500">persons</span>
                </div>
              )}
            </div>

            {/* Zones */}
            {video.zones && video.zones.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {video.zones.map((zone) => (
                    <Badge key={zone} variant="primary">
                      {zone}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="text-center py-4 text-gray-400 text-sm">
              No tracking data available
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
          <Button variant="primary" size="sm" className="flex-1">
            <Play className="w-4 h-4" />
            View Dashboard
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
}
