'use client';

import { cn } from '@/lib/utils';
import {
  Utensils, Camera, Mic2, Search, Plus,
  Clock, Calendar, BarChart2, Heart, Shield
} from 'lucide-react';
import Link from 'next/link';

interface QuickActionsProps {
  onLogMeal?: () => void;
  onVoiceLog?: () => void;
  onPhotoLog?: () => void;
}

export function QuickActions({ onLogMeal, onVoiceLog, onPhotoLog }: QuickActionsProps) {
  const actions = [
    {
      label: 'Log Meal',
      description: 'Search and log food',
      icon: Utensils,
      color: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
      href: '/meals/new',
      onClick: onLogMeal,
    },
    {
      label: 'Photo Log',
      description: 'Snap a picture of your plate',
      icon: Camera,
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      href: '/meals/photo',
      onClick: onPhotoLog,
    },
    {
      label: 'Voice Log',
      description: 'Speak your meal in Hindi/English',
      icon: Mic2,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      href: '/meals/voice',
      onClick: onVoiceLog,
    },
    {
      label: 'Search Foods',
      description: 'Browse 500+ Indian foods',
      icon: Search,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      href: '/foods',
    },
  ];

  const shortcuts = [
    { label: 'Breakfast', mealType: 'breakfast' },
    { label: 'Lunch', mealType: 'lunch' },
    { label: 'Dinner', mealType: 'dinner' },
    { label: 'Snack', mealType: 'snack' },
  ];

  return (
    <div className="space-y-6">
      {/* Main actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
          <p className="card-description">Log your meals fast</p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {actions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  'hover:border-primary/30 dark:hover:border-primary/700',
                  action.color
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  action.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-').replace('dark:bg-', 'dark:bg-')
                )}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white text-center">{action.label}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{action.description}</p>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Meal type shortcuts */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Log by Meal Type</h3>
          <p className="card-description">One-tap logging for common meals</p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.mealType}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/30 dark:hover:border-primary/700',
                  'hover:bg-primary/50 dark:hover:bg-primary/900/30',
                  'transition-colors text-left'
                )}
              >
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-primary" />
                  <span className="font-medium text-sm">{shortcut.label}</span>
                </div>
                <p className="text-xs text-text-muted">Tap to log {shortcut.mealType}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Utility links */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">More Tools</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-2 gap-3">
            <Link href="/meals/history" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 dark:hover:border-primary/700 transition-colors">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Meal History</p>
                <p className="text-xs text-text-muted">View past meals & carbs</p>
              </div>
            </Link>
            <Link href="/meals/analytics" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 dark:hover:border-primary/700 transition-colors">
              <BarChart2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Meal Analytics</p>
                <p className="text-xs text-text-muted">Carb trends & patterns</p>
              </div>
            </Link>
            <Link href="/foods/favorites" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 dark:hover:border-primary/700 transition-colors">
              <Utensils className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Favorite Foods</p>
                <p className="text-xs text-text-muted">Quick access to your foods</p>
              </div>
            </Link>
            <Link href="/foods/composite" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 dark:hover:border-primary/700 transition-colors">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Composite Meals</p>
                <p className="text-xs text-text-muted">Thali, dosa-sambar, etc.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}