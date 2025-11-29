'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { VideoCard } from '@/components/history/VideoCard';
import { Button, Input, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { HistoryVideo } from '@/types';
import {
  Search,
  Grid3X3,
  List,
  SlidersHorizontal,
  FolderOpen,
  Plus,
  ArrowUpDown
} from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const [videos, setVideos] = useState<HistoryVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<HistoryVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Filter videos when search changes
  useEffect(() => {
    let filtered = videos;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(video =>
        video.original_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.processed_date - a.processed_date;
      }
      return a.processed_date - b.processed_date;
    });

    setFilteredVideos(filtered);
  }, [videos, searchQuery, sortOrder]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await api.getHistory();
      setVideos(data.videos);
      setFilteredVideos(data.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Video History"
        subtitle="View and manage processed videos"
      />

      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View toggles */}
            <div className="flex items-center gap-2">
              {/* View mode */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* Sort dropdown */}
              <button
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </button>

              {/* Filters */}
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>

              {/* Create new */}
              <Link href="/">
                <Button variant="success">
                  <Plus className="w-4 h-4" />
                  New Application
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-500">Loading video history...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">Error loading history</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <Button variant="secondary" className="mt-4" onClick={loadHistory}>
              Try Again
            </Button>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No videos found' : 'No processed videos yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Upload and process a video to see it here'
              }
            </p>
            {!searchQuery && (
              <Link href="/">
                <Button variant="primary">
                  <Plus className="w-4 h-4" />
                  Create Application
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredVideos.map((video) => (
              <VideoCard key={video.filename} video={video} onDelete={loadHistory} />
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && !error && filteredVideos.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredVideos.length} of {videos.length} videos
          </div>
        )}
      </div>
    </div>
  );
}

