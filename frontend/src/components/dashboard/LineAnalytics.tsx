'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { LineStats } from '@/types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ArrowLeftRight, LogIn, LogOut, Activity } from 'lucide-react';

interface LineAnalyticsProps {
  lineName: string;
  lineData: LineStats;
}

export function LineAnalytics({ lineName, lineData }: LineAnalyticsProps) {
  const timeline = lineData.timeline || [];
  const totalIn = lineData.in || 0;
  const totalOut = lineData.out || 0;
  const netFlow = totalIn - totalOut;
  const totalCrossings = totalIn + totalOut;

  // Prepare chart data
  const chartData = timeline.map(point => ({
    time: point.time,
    in: point.in_count,
    out: point.out_count,
  }));

  // Calculate flow rate
  const totalSeconds = timeline.length > 0 ? timeline[timeline.length - 1].time_seconds : 0;
  const flowRateIn = totalSeconds > 0 ? (totalIn / (totalSeconds / 60)).toFixed(1) : '0';
  const flowRateOut = totalSeconds > 0 ? (totalOut / (totalSeconds / 60)).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            {lineName}
          </CardTitle>
          <Badge variant="default">
            ↔️ Counting Line
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6">
          {/* Chart */}
          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-4">Cumulative Crossings</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="in"
                    name="IN"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="out"
                    name="OUT"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Statistics</p>
            
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <LogIn className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">Total IN</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{totalIn}</p>
              <p className="text-xs text-emerald-600">{flowRateIn} per min</p>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 mb-1">
                <LogOut className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-700 font-medium">Total OUT</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{totalOut}</p>
              <p className="text-xs text-red-600">{flowRateOut} per min</p>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              netFlow > 0 
                ? 'bg-blue-50 border-blue-100' 
                : netFlow < 0 
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Activity className={`w-4 h-4 ${
                  netFlow > 0 ? 'text-blue-600' : netFlow < 0 ? 'text-amber-600' : 'text-gray-600'
                }`} />
                <span className={`text-xs font-medium ${
                  netFlow > 0 ? 'text-blue-700' : netFlow < 0 ? 'text-amber-700' : 'text-gray-700'
                }`}>Net Flow</span>
              </div>
              <p className={`text-2xl font-bold ${
                netFlow > 0 ? 'text-blue-700' : netFlow < 0 ? 'text-amber-700' : 'text-gray-700'
              }`}>
                {netFlow > 0 ? '+' : ''}{netFlow}
              </p>
              <p className={`text-xs ${
                netFlow > 0 ? 'text-blue-600' : netFlow < 0 ? 'text-amber-600' : 'text-gray-600'
              }`}>
                {netFlow > 0 ? 'more IN' : netFlow < 0 ? 'more OUT' : 'balanced'}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-700 font-medium">Total Crossings</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{totalCrossings}</p>
              <p className="text-xs text-purple-600">both directions</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

