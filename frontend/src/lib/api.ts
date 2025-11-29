import {
  VideoUploadInfo,
  Zone,
  Line,
  ProcessResponse,
  TrackingData,
  HistoryVideo
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export const api = {
  // Upload video with progress tracking
  uploadVideo: (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<VideoUploadInfo> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);

          if (xhr.status === 200 && data.success) {
            resolve(data);
          } else {
            // Parse error message from FastAPI response
            const errorMsg = data.detail || data.error || `Upload failed (${xhr.status})`;
            reject(new Error(errorMsg));
          }
        } catch (error) {
          reject(new Error(`Server error: ${xhr.status} - ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error - Is the backend running on http://localhost:8002?'));
      });

      xhr.open('POST', `${API_BASE}/upload`);
      xhr.send(formData);
    });
  },

  // Process video with zones and lines
  processVideo: async (
    filename: string,
    zones: Zone[],
    lines: Line[]
  ): Promise<ProcessResponse> => {
    const response = await fetch(`${API_BASE}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, zones, lines }),
    });

    if (!response.ok) {
      throw new Error(`Processing failed: ${response.statusText}`);
    }

    return response.json();
  },

  // Get processing history
  getHistory: async (): Promise<{ videos: HistoryVideo[] }> => {
    const response = await fetch(`${API_BASE}/api/history`);

    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }

    return response.json();
  },

  // Get tracking data for a specific video
  getTrackingData: async (filename: string): Promise<TrackingData> => {
    const response = await fetch(
      `${API_BASE}/tracking-data/${encodeURIComponent(filename)}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch tracking data');
    }

    return response.json();
  },

  // Get video URL for playback
  getVideoUrl: async (filename: string): Promise<{ video_url: string }> => {
    const response = await fetch(
      `${API_BASE}/get-video-url/${encodeURIComponent(filename)}`
    );

    if (!response.ok) {
      throw new Error('Failed to get video URL');
    }

    return response.json();
  },

  // Download endpoints
  getDownloadUrl: (filename: string) =>
    `${API_BASE}/download/${encodeURIComponent(filename)}`,

  getCSVDownloadUrl: (filename: string) =>
    `${API_BASE}/download-csv/${encodeURIComponent(filename)}`,

  getJSONDownloadUrl: (filename: string) =>
    `${API_BASE}/download-json/${encodeURIComponent(filename)}`,

  // Get preview image URL
  getPreviewUrl: () => `${API_BASE}/static/preview.jpg`,

  // Delete video
  deleteVideo: async (filename: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE}/delete/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete video');
    }

    return response.json();
  },
};

export default api;
