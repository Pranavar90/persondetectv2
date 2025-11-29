'use client';

import { Line } from '@/types';
import { Button } from '@/components/ui';
import { Trash2, ArrowLeftRight } from 'lucide-react';
import { rgbToCSS } from '@/lib/utils';

interface LineListProps {
  lines: Line[];
  onDelete: (index: number) => void;
}

export function LineList({ lines, onDelete }: LineListProps) {
  if (lines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No counting lines yet</p>
        <p className="text-xs mt-1">Click &quot;Add Counting Line&quot; to create</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
      {lines.map((line, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: rgbToCSS(line.color) }}
            />
            <div>
              <span className="font-medium text-gray-900 text-sm">{line.name}</span>
              <div className="text-xs text-gray-500">
                Counting IN/OUT crossings
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(index)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

