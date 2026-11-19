'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { cn, formatTimeAgo, getMealTypeColor, getInputMethodIcon } from '@/lib/utils';
import { Calendar, Filter, ChevronDown, ChevronRight, Utensils, Clock, Download, RefreshCw, MapPin, Smile, Camera, Mic, Barcode, PenLine } from 'lucide-react';

interface Meal {
  id: string;
  mealTime: string;
  mealType: string;
  inputMethod: string;
  items: any[];
  totalCarbsG: number;
  totalProteinG?: number;
  totalFatG?: number;
  totalFiberG?: number;
  locationType?: string;
  hungerLevel?: number;
  moodTag?: string;
  notes?: string;
  loggedAt: string;
}

interface MealHistoryProps {
  initialFilters?: {
    mealType?: string;
    dateRange?: string;
    searchQuery?: string;
  };
  onFiltersChange?: (filters: any) => void;
}

export function MealHistory({ initialFilters, onFiltersChange }: MealHistoryProps) {
  const [filters, setFilters] = useState({
    mealType: initialFilters?.mealType || 'all',
    dateRange: initialFilters?.dateRange || 'week',
    searchQuery: initialFilters?.searchQuery || '',
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);

  // Fetch meals with infinite scroll
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery({
    queryKey: ['meals', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(filters.mealType !== 'all' && { mealType: filters.mealType.toUpperCase() }),
        ...(filters.dateRange !== 'all' && { startDate: getStartDate(filters.dateRange) }),
      });
      const res = await fetch(`/api/v1/meals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch meals');
      return res.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNext) return lastPage.pagination.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  // Flatten meals from all pages
  const meals = data?.pages.flatMap(page => page.data) || [];

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    onFiltersChange?.({ ...filters, [key]: value });
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/v1/profile/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `t1d-india-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 p-3">
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

  if (error) {
    return (
      <div className="card">
        <div className="card-content text-center py-8">
          <p className="text-red-600">Failed to load meals</p>
          <button onClick={() => refetch()} className="mt-2 btn-outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Meal History</h2>
          <p className="text-muted-foreground">{meals.length} meals logged</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleExport} className="btn-outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card animate-slide-down">
          <div className="card-content pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Meal Type</label>
                <select
                  value={filters.mealType}
                  onChange={(e) => handleFilterChange('mealType', e.target.value)}
                  className="input"
                >
                  <option value="all">All</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="input"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search meals..."
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ mealType: 'all', dateRange: 'week', searchQuery: '', page: 1 });
                  }}
                  className="btn-outline w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meals list */}
      <div className="card overflow-hidden">
        {meals.length === 0 ? (
          <div className="card-content text-center py-12">
            <Utensils className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">No meals found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.searchQuery
                ? `No meals match "${filters.searchQuery}"`
                : 'Start logging your meals to see them here'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {meals.map((meal) => (
                <MealRow key={meal.id} meal={meal} />
              ))}
            </div>

            {/* Load more */}
            {hasNextPage && (
              <div className="p-4 border-t">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full btn-outline"
                >
                  {isFetchingNextPage ? (
                    'Loading...'
                  ) : (
                    'Load More Meals'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MealRow({ meal }: { meal: Meal }) {
  const time = new Date(meal.mealTime);
  const loggedTime = new Date(meal.loggedAt);

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Input method icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#FAF4E8] dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
          {meal.inputMethod === 'PHOTO_ML' || meal.inputMethod === 'PHOTO_OCR' ? (
            <Camera className="w-5 h-5" />
          ) : meal.inputMethod === 'VOICE' ? (
            <Mic className="w-5 h-5" />
          ) : meal.inputMethod === 'BARCODE' ? (
            <Barcode className="w-5 h-5" />
          ) : (
            <Utensils className="w-5 h-5" />
          )}
        </div>

        {/* Meal info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              getMealTypeColor(meal.mealType)
            )}>
              {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              {time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-sm text-muted-foreground">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-xs text-muted-foreground">
              Logged {formatTimeAgo(loggedTime)}
            </span>
          </div>

          {/* Items */}
          <div className="mt-2 flex flex-wrap gap-2">
            {meal.items.slice(0, 4).map((item, i) => (
              <span key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground">,</span>}
                <span>{item.name}</span>
                <span className="text-muted-foreground">({Math.round(item.carbsG || 0)}g)</span>
              </span>
            ))}
            {meal.items.length > 4 && (
              <span className="text-sm text-muted-foreground">
                +{meal.items.length - 4} more
              </span>
            )}
          </div>

          {/* Context */}
          {(meal.locationType || meal.hungerLevel || meal.moodTag) && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {meal.locationType && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {meal.locationType}
                </span>
              )}
              {meal.hungerLevel && (
                <span className="flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-muted-foreground" /> Hunger: {meal.hungerLevel}/10
                </span>
              )}
              {meal.moodTag && (
                <span className="flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-muted-foreground" /> {meal.moodTag}
                </span>
              )}
            </div>
          )}

          {meal.notes && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500 italic">
              "{meal.notes}"
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="flex-shrink-0 text-right">
          <div className="text-2xl font-bold text-primary-600">{Math.round(meal.totalCarbsG)}g</div>
          <div className="text-xs text-muted-foreground">carbs</div>
          <div className="mt-1 flex justify-end gap-3 text-xs text-muted-foreground">
            <span>P: {meal.totalProteinG?.toFixed(1) || 0}g</span>
            <span>F: {meal.totalFatG?.toFixed(1) || 0}g</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStartDate(range: string): string {
  const now = new Date();
  switch (range) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0)).toISOString();
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(0).toISOString();
  }
}