'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { ZoneAnalytics } from '@/components/dashboard/ZoneAnalytics';
import { LineAnalytics } from '@/components/dashboard/LineAnalytics';
import { VideoPlayer } from '@/components/dashboard/VideoPlayer';
import { Button, Spinner, Badge } from '@/components/ui';
import { api } from '@/lib/api';
import { TrackingData } from '@/types';
import {
  ArrowLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  Users,
  Clock,
  MapPin,
  ArrowLeftRight,
  Activity,
  Play,
} from 'lucide-react';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const filename = decodeURIComponent(params.filename as string);
  
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | string>('overview');

  useEffect(() => {
    loadData();
  }, [filename]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getTrackingData(filename);
      setTrackingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadVideo = () => {
    window.location.href = api.getDownloadUrl(filename);
  };

  const handleDownloadCSV = () => {
    window.location.href = api.getCSVDownloadUrl(filename);
  };

  const handleDownloadJSON = () => {
    window.location.href = api.getJSONDownloadUrl(filename);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">Loading analytics data...</p>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error || 'No tracking data available'}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Button variant="primary" onClick={loadData}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { video_info, zones, summary } = trackingData;
  const zoneNames = Object.keys(zones);
  const lineNames = Object.keys(summary.line_stats || {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Video Analytics Dashboard"
        subtitle={filename.replace('processed_', '').replace('.mp4', '')}
      />

      <div className="p-6 space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <Link href="/history">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4" />
              Back to History
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="success" onClick={handleDownloadVideo}>
              <Download className="w-4 h-4" />
              Download Video
            </Button>
            <Button variant="secondary" onClick={handleDownloadCSV}>
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={handleDownloadJSON}>
              <FileJson className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Persons"
            value={summary.total_persons_detected || 0}
            subtitle={`${summary.total_persons_seen || 0} seen total`}
            icon={Users}
          />
          <StatCard
            title="Duration"
            value={video_info.duration}
            subtitle={`${video_info.fps} FPS`}
            icon={Clock}
          />
          <StatCard
            title="Zones"
            value={zoneNames.length}
            subtitle="configured"
            icon={MapPin}
          />
          <StatCard
            title="Lines"
            value={lineNames.length}
            subtitle="counting lines"
            icon={ArrowLeftRight}
          />
          
          {/* Line stats */}
          {Object.entries(summary.line_stats || {}).map(([lineName, stats]) => (
            <StatCard
              key={lineName}
              title={lineName}
              value={
                <span>
                  <span className="text-emerald-600">{stats.in}</span>
                  {' / '}
                  <span className="text-red-600">{stats.out}</span>
                </span>
              }
              subtitle="IN / OUT"
              icon={ArrowLeftRight}
            />
          ))}
        </div>

        {/* Zone/Line Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            
            {zoneNames.map((zoneName) => {
              const zoneType = zones[zoneName].type;
              return (
                <button
                  key={zoneName}
                  onClick={() => setActiveTab(zoneName)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === zoneName
                      ? zoneType === 'staff'
                        ? 'bg-purple-600 text-white'
                        : 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {zoneType === 'staff' ? '👔' : '👥'} {zoneName}
                  <Badge 
                    variant={zoneType === 'staff' ? 'info' : 'success'}
                    className={activeTab === zoneName ? 'bg-white/20 text-white' : ''}
                  >
                    {zoneType}
                  </Badge>
                </button>
              );
            })}

            {lineNames.map((lineName) => (
              <button
                key={lineName}
                onClick={() => setActiveTab(`line-${lineName}`)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === `line-${lineName}`
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ↔️ {lineName}
                <Badge 
                  variant="default"
                  className={activeTab === `line-${lineName}` ? 'bg-white/20 text-white' : ''}
                >
                  Line
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Player */}
            <VideoPlayer filename={filename} />

            {/* Quick Stats */}
            <div className="space-y-4">
              {zoneNames.map((zoneName) => (
                <ZoneAnalytics
                  key={zoneName}
                  zoneName={zoneName}
                  zoneData={zones[zoneName]}
                />
              ))}
              
              {lineNames.map((lineName) => (
                <LineAnalytics
                  key={lineName}
                  lineName={lineName}
                  lineData={summary.line_stats[lineName]}
                />
              ))}
            </div>
          </div>
        ) : activeTab.startsWith('line-') ? (
          <LineAnalytics
            lineName={activeTab.replace('line-', '')}
            lineData={summary.line_stats[activeTab.replace('line-', '')]}
          />
        ) : (
          <ZoneAnalytics
            zoneName={activeTab}
            zoneData={zones[activeTab]}
          />
        )}
      </div>
    </div>
  );
}

