'use client';

import { Zone } from '@/types';
import { Button, Badge } from '@/components/ui';
import { Trash2, MapPin } from 'lucide-react';
import { rgbToCSS } from '@/lib/utils';

interface ZoneListProps {
  zones: Zone[];
  onDelete: (index: number) => void;
}

export function ZoneList({ zones, onDelete }: ZoneListProps) {
  if (zones.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No zones created yet</p>
        <p className="text-xs mt-1">Click &quot;Start Drawing Zone&quot; to begin</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
      {zones.map((zone, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: rgbToCSS(zone.color) }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{zone.name}</span>
                <Badge variant={zone.type === 'staff' ? 'info' : 'success'}>
                  {zone.type === 'staff' ? '👔 Staff' : '👥 Customer'}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">{zone.points.length} points</span>
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

