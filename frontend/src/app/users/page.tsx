'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui';
import { Users } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="User Management" subtitle="Manage users and permissions" />
      
      <div className="p-6">
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                User management features will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

