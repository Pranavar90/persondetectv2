'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  valueColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className,
  valueColor = 'text-gray-900',
}: StatCardProps) {
  return (
    <div className={cn('stat-card hover:shadow-md transition-shadow', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className={cn('text-3xl font-bold', valueColor)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
            )}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
              {trendValue}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}

