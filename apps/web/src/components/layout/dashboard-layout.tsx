'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Utensils,
  Activity,
  Droplet,
  User,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Bell,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth, useSyncStatus } from '@/app/providers';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Meals', href: '/meals', icon: Utensils },
  { name: 'CGM', href: '/cgm', icon: Activity },
  { name: 'Insulin', href: '/insulin', icon: Droplet },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { isOnline } = useSyncStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isSignedIn) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">T1D India</span>
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">User</p>
              <p className="text-xs text-muted-foreground truncate">patient@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 rounded-full bg-primary-600 text-white shadow-lg"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Main content */}
      <div className="lg:pl-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Online status */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Notifications */}
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

import { useState } from 'react';