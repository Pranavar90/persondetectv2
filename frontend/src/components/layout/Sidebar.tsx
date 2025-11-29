'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  History,
  Settings,
  Users,
  Activity,
  FileCode,
  User,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { name: 'Applications', href: '/', icon: LayoutGrid },
  { name: 'History', href: '/history', icon: History },
];

const settingsNavItems: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'User Management', href: '/users', icon: Users },
  { name: 'System Health', href: '/health', icon: Activity },
  { name: 'API Browser', href: '/api-docs', icon: FileCode },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200">
      {/* User Profile Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-semibold text-gray-900">System Admin</h2>
          <p className="text-xs text-gray-500">systemadmin</p>
          <p className="text-xs text-gray-400">System Admin Access</p>
          <button className="mt-3 px-4 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            EDIT PROFILE
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={cn('w-5 h-5', active ? 'text-blue-600' : 'text-gray-400')} />
              <span>{item.name}</span>
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100" />

      {/* Settings Section */}
      <nav className="p-4 space-y-1">
        {settingsNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={cn('w-5 h-5', active ? 'text-blue-600' : 'text-gray-400')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-center text-gray-400">
          Person Tracking v1.0
        </p>
      </div>
    </aside>
  );
}

