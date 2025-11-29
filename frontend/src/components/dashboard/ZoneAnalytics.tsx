'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { ZoneMetadata } from '@/types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Users, Briefcase, Activity, Clock } from 'lucide-react';

interface ZoneAnalyticsProps {
  zoneName: string;
  zoneData: ZoneMetadata;
}

export function ZoneAnalytics({ zoneName, zoneData }: ZoneAnalyticsProps) {
  const isStaffZone = zoneData.type === 'staff';
  const timeline = zoneData.timeline || [];

  // Calculate stats
  const totalPoints = timeline.length;
  
  // Staff zone stats
  const activeCount = timeline.filter(t => t.active === 1).length;
  const inactiveCount = totalPoints - activeCount;
  const activePercentage = totalPoints > 0 ? ((activeCount / totalPoints) * 100).toFixed(1) : '0';
  
  // Customer zone stats
  const counts = timeline.map(t => t.count || 0);
  const avgOccupancy = counts.length > 0 
    ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) 
    : '0';
  const maxOccupancy = counts.length > 0 ? Math.max(...counts) : 0;
  const minOccupancy = counts.length > 0 ? Math.min(...counts) : 0;

  // Prepare chart data
  const chartData = timeline.map(point => ({
    time: point.time,
    value: isStaffZone ? point.active : point.count,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isStaffZone ? (
              <Briefcase className="w-5 h-5 text-purple-600" />
            ) : (
              <Users className="w-5 h-5 text-emerald-600" />
            )}
            {zoneName}
          </CardTitle>
          <Badge variant={isStaffZone ? 'info' : 'success'}>
            {isStaffZone ? 'Staff Zone' : 'Customer Zone'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6">
          {/* Chart */}
          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-4">
              {isStaffZone ? 'Activity Timeline' : 'Occupancy Over Time'}
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    domain={isStaffZone ? [0, 1] : [0, 'auto']}
                    tickFormatter={isStaffZone ? (v) => v === 1 ? 'Active' : 'Inactive' : undefined}
                  />
                  <Tooltip 
                    formatter={(value: number) => 
                      isStaffZone 
                        ? (value === 1 ? 'Active' : 'Inactive')
                        : `${value} people`
                    }
                  />
                  <Area
                    type={isStaffZone ? 'stepAfter' : 'monotone'}
                    dataKey="value"
                    stroke={isStaffZone ? '#7c3aed' : '#10b981'}
                    fill={isStaffZone ? '#7c3aed20' : '#10b98120'}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Statistics</p>
            
            {isStaffZone ? (
              <>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs text-emerald-700 font-medium">Active Intervals</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
                  <p className="text-xs text-emerald-600">{activeCount * 5}s total</p>
                </div>
                
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-700 font-medium">Inactive Intervals</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{inactiveCount}</p>
                  <p className="text-xs text-red-600">{inactiveCount * 5}s total</p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">Activity Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{activePercentage}%</p>
                  <p className="text-xs text-blue-600">of total time</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-700 font-medium">Average Occupancy</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{avgOccupancy}</p>
                  <p className="text-xs text-amber-600">people per second</p>
                </div>
                
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-700 font-medium">Peak Occupancy</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{maxOccupancy}</p>
                  <p className="text-xs text-red-600">max people</p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">Min Occupancy</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{minOccupancy}</p>
                  <p className="text-xs text-blue-600">min people</p>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

