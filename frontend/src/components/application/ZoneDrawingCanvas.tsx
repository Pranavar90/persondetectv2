'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Zone, Line, Point } from '@/types';
import { rgbToCSS } from '@/lib/utils';

interface ZoneDrawingCanvasProps {
  imageUrl: string | null;
  zones: Zone[];
  lines: Line[];
  currentZone: Zone | null;
  currentLine: Line | null;
  drawingMode: 'zone' | 'line' | null;
  onCanvasClick: (point: Point) => void;
  onCanvasRightClick: () => void;
}

export function ZoneDrawingCanvas({
  imageUrl,
  zones,
  lines,
  currentZone,
  currentLine,
  drawingMode,
  onCanvasClick,
  onCanvasRightClick,
}: ZoneDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });

  // Load image to determine dimensions
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        // Maintain aspect ratio
        const aspectRatio = img.width / img.height;
        const maxWidth = 800;
        const maxHeight = 600;
        
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
        
        setCanvasSize({ width, height });
      };
      img.src = imageUrl;
    } else {
        setImage(null);
    }
  }, [imageUrl]);

  // Redraw canvas (Vector graphics only)
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If no image, draw placeholder background
    if (!image) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a video to start drawing zones', canvas.width / 2, canvas.height / 2);
    }

    // Draw completed zones
    zones.forEach((zone) => drawZone(ctx, zone, canvas.width, canvas.height));

    // Draw current zone being drawn
    if (currentZone && currentZone.points.length > 0) {
      drawZone(ctx, currentZone, canvas.width, canvas.height, true);
    }

    // Draw completed lines
    lines.forEach((line) => drawLine(ctx, line, canvas.width, canvas.height));

    // Draw current line being drawn
    if (currentLine && currentLine.start) {
      if (currentLine.end) {
        drawLine(ctx, currentLine, canvas.width, canvas.height);
      } else {
        // Draw start point only
        const [r, g, b] = currentLine.color;
        ctx.fillStyle = rgbToCSS([r, g, b]);
        ctx.beginPath();
        ctx.arc(
          currentLine.start.x * canvas.width,
          currentLine.start.y * canvas.height,
          6,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }
  }, [image, zones, lines, currentZone, currentLine]);

  // Redraw on changes
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Draw a zone polygon
  const drawZone = (
    ctx: CanvasRenderingContext2D,
    zone: Zone,
    width: number,
    height: number,
    isDrawing: boolean = false
  ) => {
    if (zone.points.length === 0) return;

    const [r, g, b] = zone.color;

    // Draw polygon
    ctx.beginPath();
    ctx.moveTo(zone.points[0].x * width, zone.points[0].y * height);
    for (let i = 1; i < zone.points.length; i++) {
      ctx.lineTo(zone.points[i].x * width, zone.points[i].y * height);
    }
    if (!isDrawing) {
      ctx.closePath();
    }

    // Fill
    ctx.fillStyle = rgbToCSS([r, g, b], 0.3);
    ctx.fill();

    // Stroke
    ctx.strokeStyle = rgbToCSS([r, g, b]);
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw points
    zone.points.forEach((point) => {
      ctx.fillStyle = rgbToCSS([r, g, b]);
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Label with type indicator
    const typeIcon = zone.type === 'staff' ? '👔' : '👥';
    ctx.fillStyle = rgbToCSS([r, g, b]);
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText(
      `${typeIcon} ${zone.name}`,
      zone.points[0].x * width,
      zone.points[0].y * height - 12
    );
  };

  // Draw a line
  const drawLine = (
    ctx: CanvasRenderingContext2D,
    line: Line,
    width: number,
    height: number
  ) => {
    if (!line.start || !line.end) return;

    const [r, g, b] = line.color;

    // Draw line
    ctx.strokeStyle = rgbToCSS([r, g, b]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(line.start.x * width, line.start.y * height);
    ctx.lineTo(line.end.x * width, line.end.y * height);
    ctx.stroke();

    // Draw endpoints
    [line.start, line.end].forEach((point) => {
      ctx.fillStyle = rgbToCSS([r, g, b]);
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw direction arrow
    const midX = ((line.start.x + line.end.x) / 2) * width;
    const midY = ((line.start.y + line.end.y) / 2) * height;

    // Label
    ctx.fillStyle = rgbToCSS([r, g, b]);
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText(`↔ ${line.name}`, midX + 12, midY);
  };

  // Handle canvas click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || !drawingMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    onCanvasClick({ x, y });
  };

  // Handle right click
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    onCanvasRightClick();
  };

  return (
    <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
      {/* Background Image / Video Feed */}
      {imageUrl && (
        <img 
            src={imageUrl} 
            alt="Video Preview"
            className="absolute top-0 left-0 w-full h-full object-contain rounded-xl"
            style={{ width: '100%', height: '100%' }}
        />
      )}

      {/* Overlay Canvas for Zones/Lines */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`absolute top-0 left-0 w-full h-full rounded-xl border-2 transition-all duration-200 ${
          drawingMode
            ? 'cursor-crosshair border-blue-500 shadow-lg'
            : 'border-gray-200'
        }`}
      />
      
      {/* Drawing mode indicator */}
      {drawingMode && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-lg z-10">
          {drawingMode === 'zone' ? '🔷 Drawing Zone' : '📏 Drawing Line'}
          <span className="ml-2 text-blue-200">
            {drawingMode === 'zone' ? 'Click to add points' : 'Click start & end'}
          </span>
        </div>
      )}
    </div>
  );
}

