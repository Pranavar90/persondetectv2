'use client';

import { useState, useCallback } from 'react';
import { Upload, Film, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { VideoUploadInfo } from '@/types';

interface VideoUploaderProps {
  onUploadComplete: (data: VideoUploadInfo) => void;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  }, []);

  const handleUpload = async (file: File) => {
    // Validate by file extension (more reliable than MIME type)
    const validExtensions = ['mp4', 'avi', 'mov', 'mkv'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      setError(`Invalid file type "${fileExtension}". Please upload MP4, AVI, MOV, or MKV files.`);
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setError(null);
    setUploadProgress(0);

    try {
      const data = await api.uploadVideo(file, (progress) => {
        setUploadProgress(progress);
      });

      if (data.success) {
        setUploadStatus('success');
        onUploadComplete(data);
      } else {
        throw new Error((data as unknown as { detail?: string }).detail || 'Upload failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed. Check if backend is running on port 8002.';
      setError(errorMessage);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : uploadStatus === 'success'
              ? 'border-emerald-500 bg-emerald-50'
              : uploadStatus === 'error'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        )}
      >
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-4">
          {uploadStatus === 'success' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-700">Upload Complete!</p>
                <p className="text-sm text-emerald-600">Video is ready for processing</p>
              </div>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-700">Upload Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </>
          ) : (
            <>
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                isDragging ? 'bg-blue-100' : 'bg-gray-100'
              )}>
                {isUploading ? (
                  <Film className="w-8 h-8 text-blue-600 animate-pulse" />
                ) : (
                  <Upload className={cn('w-8 h-8', isDragging ? 'text-blue-600' : 'text-gray-400')} />
                )}
              </div>
              <div>
                <p className={cn('font-semibold', isDragging ? 'text-blue-700' : 'text-gray-700')}>
                  {isDragging ? 'Drop your video here' : 'Drag & drop your video'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse (MP4, AVI, MOV, MKV)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Uploading...</span>
            <span className="font-medium text-blue-600">{uploadProgress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Another Button */}
      {uploadStatus === 'success' && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            setUploadStatus('idle');
            setUploadProgress(0);
          }}
        >
          Upload Another Video
        </Button>
      )}
    </div>
  );
}
