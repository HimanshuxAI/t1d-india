'use client';

import { cn } from '@/lib/utils';
import { Clock, Utensils, ChevronRight } from 'lucide-react';
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
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Meals</h3>
        </div>
        <div className="card-content">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Meals</h3>
        </div>
        <div className="card-content text-center py-8">
          <Utensils className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-muted-foreground">No meals logged yet</p>
          <Link href="/meals/new" className="mt-4 inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline">
            Log your first meal
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const getMealTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'breakfast': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'lunch': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'dinner': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'snack': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getInputMethodIcon = (method: string) => {
    switch (method) {
      case 'PHOTO_ML':
      case 'PHOTO_OCR':
        return '📷';
      case 'VOICE':
        return '🎤';
      case 'COMPOSITE_SELECT':
        return '🍽️';
      default:
        return '✏️';
    }
  };

  return (
    <div className="card">
      <div className="card-header flex flex-row items-center justify-between">
        <div>
          <h3 className="card-title">Recent Meals</h3>
          <p className="card-description">Your latest meal logs</p>
        </div>
        <Link href="/meals/history" className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="card-content">
        <div className="space-y-3">
          {meals.slice(0, 5).map((meal) => (
            <Link
              key={meal.id}
              href={`/meals/${meal.id}`}
              className={cn(
                'flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800',
                'hover:border-primary-200 dark:hover:border-primary-800',
                'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                'transition-colors group'
              )}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-xl">{getInputMethodIcon(meal.inputMethod)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    getMealTypeColor(meal.mealType)
                  )}>
                    {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(meal.mealTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                  {meal.items.slice(0, 3).map((item, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground">,</span>}
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">({Math.round(item.carbsG)}g)</span>
                    </span>
                  ))}
                  {meal.items.length > 3 && (
                    <span className="text-muted-foreground">+{meal.items.length - 3} more</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(meal.totalCarbsG)}g
                  </p>
                  <p className="text-xs text-muted-foreground">carbs</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}