'use client';

import { ReactNode, useState } from 'react';
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
  Bell,
  Sparkles,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth, useSyncStatus } from '@/app/providers';
import { BrandLogo } from '@/components/brand/logo';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Meals & Carbs', href: '/meals', icon: Utensils },
  { name: 'CGM Stream', href: '/cgm', icon: Activity },
  { name: 'Insulin Bolus', href: '/insulin', icon: Droplet },
  { name: 'Food Database', href: '/foods', icon: Search },
  { name: 'Patient Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { isOnline } = useSyncStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF4E8] dark:bg-[#16131C] text-[#231F2B] dark:text-[#F3EEE4]">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#231F2B]/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#221E2B] border-r border-[#231F2B]/10 dark:border-white/10 flex flex-col justify-between transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          {/* Brand header */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
            <Link href="/dashboard" className="flex items-center">
              <BrandLogo size="md" />
            </Link>
            <button
              className="lg:hidden p-2 rounded-xl text-[#231F2B] hover:bg-[#FAF4E8] dark:text-[#F3EEE4] dark:hover:bg-[#2A2536]"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Regimen banner chip */}
          <div className="mx-4 mt-4 px-3.5 py-2.5 rounded-xl bg-[#FAF4E8] dark:bg-[#1A1622] border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2A3F8F] dark:text-[#7F93E6]" />
              <span className="text-xs font-semibold text-[#231F2B] dark:text-[#F3EEE4]">
                Indian T1D Protocol
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#2A3F8F]/10 text-[#2A3F8F] dark:bg-[#7F93E6]/20 dark:text-[#7F93E6]">
              NPH + Reg
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-sm'
                      : 'text-[#231F2B]/80 dark:text-[#F3EEE4]/80 hover:bg-[#FAF4E8] dark:hover:bg-[#2A2536] hover:text-[#2A3F8F] dark:hover:text-[#7F93E6]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn('w-5 h-5', isActive ? 'text-[#FAF4E8]' : 'text-[#5C5665] dark:text-[#8C8496]')} />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-[#231F2B]/[0.08] dark:border-white/[0.08] bg-[#FAF4E8]/50 dark:bg-[#1A1622]/50">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10">
            <div className="w-10 h-10 rounded-full bg-[#E0527F]/15 border-2 border-[#E0527F] flex items-center justify-center font-serif font-bold text-[#E0527F] text-base">
              AS
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-[#231F2B] dark:text-[#F3EEE4] truncate">Aarav Sharma</p>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E8B57]" title="Active" />
              </div>
              <p className="text-xs text-[#5C5665] dark:text-[#8C8496] truncate">14y · ICR: 10g/U</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="lg:pl-72 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#FAF4E8]/90 dark:bg-[#16131C]/90 backdrop-blur-md border-b border-[#231F2B]/10 dark:border-white/10">
          <div className="flex items-center justify-between h-20 px-4 sm:px-8">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2.5 rounded-xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 text-[#231F2B] dark:text-[#F3EEE4] shadow-sm"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-widest text-[#E0527F]">
                    नमस्ते
                  </span>
                  <span className="text-xs text-[#5C5665] dark:text-[#8C8496]">· Good Afternoon</span>
                </div>
                <h1 className="font-serif text-2xl font-black text-[#231F2B] dark:text-[#F3EEE4]">
                  Aarav Sharma
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* CGM Sensor live badge */}
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-sm text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#2E8B57]" />
                <span className="text-[#231F2B] dark:text-[#F3EEE4]">Dexcom G6</span>
                <span className="text-[#5C5665] dark:text-[#8C8496]">· 108 mg/dL</span>
              </div>

              {/* Notification icon */}
              <button
                className="p-2.5 rounded-xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 hover:bg-[#FAF4E8] dark:hover:bg-[#2A2536] text-[#231F2B] dark:text-[#F3EEE4] relative transition-colors shadow-sm"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E0527F] rounded-full ring-2 ring-white dark:ring-[#221E2B]" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}