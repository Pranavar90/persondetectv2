'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Settings, Bell, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Settings" subtitle="Configure application settings" />
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">
                Configure general application settings including processing parameters and defaults.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">
                Configure notification preferences and alerts.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">
                Manage security settings and access controls.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">
                Manage stored data, exports, and cleanup options.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

