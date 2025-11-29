import { clsx, type ClassValue } from 'clsx';

// Combine class names
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format date from timestamp
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format duration from seconds
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Generate random color for zones/lines
export function getRandomColor(): number[] {
  const colors = [
    [255, 0, 0],     // Red
    [0, 255, 0],     // Green
    [0, 0, 255],     // Blue
    [255, 255, 0],   // Yellow
    [255, 0, 255],   // Magenta
    [0, 255, 255],   // Cyan
    [255, 128, 0],   // Orange
    [128, 0, 255],   // Purple
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Convert RGB array to CSS color
export function rgbToCSS(color: number[], alpha: number = 1): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

// Truncate filename
export function truncateFilename(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) return filename;
  const ext = filename.split('.').pop() || '';
  const name = filename.slice(0, filename.length - ext.length - 1);
  const truncatedName = name.slice(0, maxLength - ext.length - 4) + '...';
  return `${truncatedName}.${ext}`;
}

