'use client';

import { cn } from '@/lib/utils';
import {
  Utensils,
  Camera,
  Mic2,
  Search,
  Sparkles,
  Clock,
  Layers,
  Heart,
  ChevronRight,
  Soup,
  Coffee,
  Sun,
  Moon,
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
      badge: 'Thali & Roti',
      description: 'Search & count carbs',
      icon: Utensils,
      bg: 'bg-[#2A3F8F] text-[#FAF4E8] hover:bg-[#223273]',
      accentBg: 'bg-white/20 text-white',
      href: '/meals/new',
      onClick: onLogMeal,
    },
    {
      label: 'Photo Plate Log',
      badge: 'Camera',
      description: 'Snap your food plate',
      icon: Camera,
      bg: 'bg-[#E0527F] text-white hover:bg-[#C93665]',
      accentBg: 'bg-white/20 text-white',
      href: '/meals/photo',
      onClick: onPhotoLog,
    },
    {
      label: 'Voice Log',
      badge: 'Hindi / Eng',
      description: '"2 roti, 1 katori dal"',
      icon: Mic2,
      bg: 'bg-[#E8A33D] text-white hover:bg-[#CB8020]',
      accentBg: 'bg-white/20 text-white',
      href: '/meals/voice',
      onClick: onVoiceLog,
    },
    {
      label: 'Food Database',
      badge: '500+ Desi',
      description: 'ICMR nutrition data',
      icon: Search,
      bg: 'bg-[#2E8B57] text-white hover:bg-[#256F45]',
      accentBg: 'bg-white/20 text-white',
      href: '/foods',
    },
  ];

  const mealShortcuts = [
    {
      label: 'नाश्ता · Breakfast',
      sub: 'Poha, Idli, Paratha',
      time: '08:00 - 10:00',
      icon: Coffee,
      type: 'BREAKFAST',
    },
    {
      label: 'दोपहर · Lunch',
      sub: 'Dal, Roti, Sabzi, Rice',
      time: '12:30 - 14:30',
      icon: Sun,
      type: 'LUNCH',
    },
    {
      label: 'शाम · Tea & Snack',
      sub: 'Roasted Chana, Chaas',
      time: '17:00 - 18:30',
      icon: Soup,
      type: 'SNACK',
    },
    {
      label: 'रात · Dinner',
      sub: 'Khichdi, Roti, Sambar',
      time: '20:00 - 21:30',
      icon: Moon,
      type: 'DINNER',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Intake Card */}
      <div className="card p-6 bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_2px_12px_rgba(35,31,43,0.04)]">
        <div className="flex items-center justify-between pb-4 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
          <div>
            <h3 className="font-serif font-bold text-xl text-[#231F2B] dark:text-[#F3EEE4]">
              Aaj Meal Mein Kya Tha?
            </h3>
            <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">Quick meal & Indian carb counting</p>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-[#FAF4E8] dark:bg-[#1A1622] text-[#2A3F8F] dark:text-[#7F93E6] border border-[#231F2B]/10">
            Bolus Calculator
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                'group p-4 rounded-2xl flex flex-col justify-between transition-all duration-150 shadow-xs hover:shadow hover:-translate-y-0.5',
                action.bg
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', action.accentBg)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20">
                  {action.badge}
                </span>
              </div>
              <div className="mt-3">
                <p className="font-serif font-bold text-base leading-snug">{action.label}</p>
                <p className="text-[11px] opacity-90 mt-0.5">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Routine Meal Slots */}
      <div className="card p-6 bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_2px_12px_rgba(35,31,43,0.04)]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
          <h4 className="font-serif font-bold text-base text-[#231F2B] dark:text-[#F3EEE4]">
            Log by Meal Slot
          </h4>
          <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">One-tap desi templates</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {mealShortcuts.map((meal) => (
            <Link
              key={meal.type}
              href={`/meals/new?type=${meal.type}`}
              className="p-3 rounded-xl bg-[#FAF4E8]/70 dark:bg-[#1A1622]/70 border border-[#231F2B]/10 dark:border-white/10 hover:border-[#2A3F8F]/40 dark:hover:border-[#7F93E6]/40 hover:bg-[#FAF4E8] dark:hover:bg-[#1A1622] transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
                  <meal.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-[#231F2B] dark:text-[#F3EEE4] group-hover:text-[#2A3F8F] transition-colors">
                    {meal.label}
                  </p>
                  <p className="text-[10px] text-[#5C5665] dark:text-[#8C8496]">{meal.sub}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8C8496] group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      </div>

      {/* Helpful Desi T1D Navigation Tools */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/foods/composite"
          className="p-4 rounded-2xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 hover:border-[#2A3F8F]/30 shadow-xs hover:shadow-sm transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#FAF4E8] dark:bg-[#1A1622] text-[#2A3F8F] dark:text-[#7F93E6] flex items-center justify-center mb-2">
            <Layers className="w-4 h-4" />
          </div>
          <p className="font-serif font-bold text-sm text-[#231F2B] dark:text-[#F3EEE4] group-hover:text-[#2A3F8F] transition-colors">
            Composite Thali
          </p>
          <p className="text-[11px] text-[#5C5665] dark:text-[#8C8496] mt-0.5">
            Auto-split mixed meals
          </p>
        </Link>

        <Link
          href="/meals/history"
          className="p-4 rounded-2xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 hover:border-[#2A3F8F]/30 shadow-xs hover:shadow-sm transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#FAF4E8] dark:bg-[#1A1622] text-[#E0527F] flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <p className="font-serif font-bold text-sm text-[#231F2B] dark:text-[#F3EEE4] group-hover:text-[#E0527F] transition-colors">
            Meal History
          </p>
          <p className="text-[11px] text-[#5C5665] dark:text-[#8C8496] mt-0.5">
            4 seeded meals & carbs
          </p>
        </Link>
      </div>
    </div>
  );
}