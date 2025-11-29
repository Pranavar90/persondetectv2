'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react';

export default function HealthPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="System Health" subtitle="Monitor system status and performance" />
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Activity className="w-5 h-5 text-emerald-600" />
                </div>
                API Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-600 font-medium">Online</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                GPU Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-blue-600 font-medium">Available</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <HardDrive className="w-5 h-5 text-purple-600" />
                </div>
                Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Check backend for details</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Wifi className="w-5 h-5 text-amber-600" />
                </div>
                Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-emerald-600 font-medium">Connected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

