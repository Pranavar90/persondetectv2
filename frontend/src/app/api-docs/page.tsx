'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { FileCode, ExternalLink } from 'lucide-react';

const endpoints = [
  { method: 'POST', path: '/upload', description: 'Upload video file' },
  { method: 'POST', path: '/process', description: 'Process video with zones/lines' },
  { method: 'GET', path: '/api/history', description: 'Get processing history' },
  { method: 'GET', path: '/tracking-data/{filename}', description: 'Get tracking data for video' },
  { method: 'GET', path: '/download/{filename}', description: 'Download processed video' },
  { method: 'GET', path: '/download-csv/{filename}', description: 'Download CSV export' },
  { method: 'GET', path: '/download-json/{filename}', description: 'Download JSON export' },
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="API Browser" subtitle="Explore available API endpoints" />
      
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                API Endpoints
              </CardTitle>
              <a 
                href="http://localhost:8002/docs" 
                target="_blank"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Open Swagger Docs
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {endpoints.map((endpoint) => (
                <div 
                  key={`${endpoint.method}-${endpoint.path}`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <Badge 
                    variant={endpoint.method === 'GET' ? 'success' : 'primary'}
                    className="font-mono"
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm font-mono text-gray-700 flex-1">
                    {endpoint.path}
                  </code>
                  <span className="text-sm text-gray-500">
                    {endpoint.description}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

