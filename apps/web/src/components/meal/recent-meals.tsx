'use client';

import { cn } from '@/lib/utils';
import { Clock, Utensils, ChevronRight, Camera, Mic2, Layers, Edit3 } from 'lucide-react';
import Link from 'next/link';

interface Meal {
  id: string;
  mealTime: string;
  mealType: string;
  inputMethod: string;
  items: Array<{
    name: string;
    quantityG: number;
    carbsG: number;
  }>;
  totalCarbsG: number;
  totalProteinG?: number;
  totalFatG?: number;
}

interface RecentMealsProps {
  meals?: Meal[];
  isLoading?: boolean;
}

export function RecentMeals({ meals = [], isLoading = false }: RecentMealsProps) {
  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[#FAF4E8] dark:bg-[#2A2536] rounded w-1/4" />
          <div className="h-16 bg-[#FAF4E8] dark:bg-[#2A2536] rounded-xl" />
          <div className="h-16 bg-[#FAF4E8] dark:bg-[#2A2536] rounded-xl" />
        </div>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="card p-6 text-center py-8 bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-[#FAF4E8] dark:bg-[#1A1622] text-[#2A3F8F] dark:text-[#7F93E6] flex items-center justify-center mx-auto mb-3">
          <Utensils className="w-6 h-6" />
        </div>
        <p className="font-serif font-bold text-base text-[#231F2B] dark:text-[#F3EEE4]">
          No meals recorded yet
        </p>
        <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-1">
          Log breakfast, lunch, or a desi snack to see carb breakdowns
        </p>
        <Link href="/meals/new" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#2A3F8F] dark:text-[#7F93E6] hover:underline">
          Record your first meal
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const getMealTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'breakfast':
        return { label: 'नाश्ता · Breakfast', badge: 'bg-[#E8A33D]/10 text-[#A45D18] border-[#E8A33D]/30' };
      case 'lunch':
        return { label: 'दोपहर · Lunch', badge: 'bg-[#2E8B57]/10 text-[#2E8B57] border-[#2E8B57]/30' };
      case 'dinner':
        return { label: 'रात · Dinner', badge: 'bg-[#2A3F8F]/10 text-[#2A3F8F] dark:text-[#7F93E6] border-[#2A3F8F]/30' };
      case 'snack':
        return { label: 'शाम · Snack', badge: 'bg-[#E0527F]/10 text-[#E0527F] border-[#E0527F]/30' };
      default:
        return { label: type, badge: 'bg-[#FAF4E8] text-[#231F2B] border-[#231F2B]/20' };
    }
  };

  const renderInputIcon = (method: string) => {
    switch (method) {
      case 'PHOTO_ML':
      case 'PHOTO_OCR':
        return <Camera className="w-4 h-4 text-[#E0527F]" />;
      case 'VOICE':
        return <Mic2 className="w-4 h-4 text-[#E8A33D]" />;
      case 'COMPOSITE_SELECT':
        return <Layers className="w-4 h-4 text-[#2A3F8F] dark:text-[#7F93E6]" />;
      default:
        return <Edit3 className="w-4 h-4 text-[#2E8B57]" />;
    }
  };

  return (
    <div className="card p-6 sm:p-7 bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_2px_12px_rgba(35,31,43,0.04)]">
      <div className="flex items-center justify-between pb-4 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
        <div>
          <h3 className="font-serif font-bold text-xl text-[#231F2B] dark:text-[#F3EEE4]">
            Recent Indian Meals
          </h3>
          <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">Past carbs & absorption timelines</p>
        </div>
        <Link
          href="/meals/history"
          className="text-xs font-bold text-[#2A3F8F] dark:text-[#7F93E6] hover:underline flex items-center gap-1"
        >
          View all 4 meals
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {meals.slice(0, 4).map((meal) => {
          const typeStyle = getMealTypeStyle(meal.mealType);
          return (
            <Link
              key={meal.id}
              href={`/meals/${meal.id}`}
              className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#FAF4E8]/50 dark:bg-[#1A1622]/50 border border-[#231F2B]/[0.08] dark:border-white/[0.08] hover:border-[#2A3F8F]/40 hover:bg-[#FAF4E8] dark:hover:bg-[#1A1622] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs">
                {renderInputIcon(meal.inputMethod)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider', typeStyle.badge)}>
                    {typeStyle.label}
                  </span>
                  <span className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                    {new Date(meal.mealTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#231F2B]/85 dark:text-[#F3EEE4]/85 truncate">
                  {meal.items.slice(0, 3).map((item, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-[#8C8496]">·</span>}
                      <span>{item.name}</span>
                      <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">({Math.round(item.carbsG)}g)</span>
                    </span>
                  ))}
                  {meal.items.length > 3 && (
                    <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">+{meal.items.length - 3} more</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="font-serif font-black text-xl text-[#231F2B] dark:text-[#F3EEE4]">
                    {Math.round(meal.totalCarbsG)}g
                  </span>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#5C5665] dark:text-[#8C8496]">carbs</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8C8496] group-hover:text-[#2A3F8F] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}