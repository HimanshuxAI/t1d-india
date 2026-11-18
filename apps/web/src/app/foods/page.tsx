'use client';

import { useState, useEffect } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { cn } from '@/lib/utils';
import {
  Search, Filter, ChevronDown, Utensils, Download,
  Star, Heart, Tag, Clock, Calendar, Grid, List
} from 'lucide-react';

const FOOD_CATEGORIES = [
  'all', 'cereal', 'pulse', 'vegetable', 'fruit', 'dairy',
  'meat', 'fish', 'egg', 'fat', 'sweet', 'beverage', 'condiment', 'composite'
];

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const REGIONS = ['all', 'north', 'south', 'east', 'west', 'central', 'pan_india'];

export default function FoodsPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'favorites' | 'composite' | 'categories'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Search foods
  const { data: searchResults, isLoading: searchLoading, refetch: refetchSearch } = useQuery({
    queryKey: ['foods', 'search', searchQuery, selectedCategory, selectedRegion],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const params = new URLSearchParams({
        q: searchQuery,
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(selectedRegion !== 'all' && { region: selectedRegion }),
        limit: '50',
      });
      const res = await fetch(`/api/v1/foods/search?${params}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  // Infinite scroll for food list
  const { data: foodList, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: listLoading } = useInfiniteQuery({
    queryKey: ['foods', 'list', selectedCategory, selectedRegion, selectedMealType],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(selectedRegion !== 'all' && { region: selectedRegion }),
      });
      const res = await fetch(`/api/v1/foods?${params}`);
      if (!res.ok) throw new Error('Failed to fetch foods');
      return res.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNext) return lastPage.pagination.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  // Composite meals
  const { data: compositeMeals, isLoading: compositeLoading } = useQuery({
    queryKey: ['foods', 'composite'],
    queryFn: async () => {
      const res = await fetch('/api/v1/foods/composite/list?limit=50');
      if (!res.ok) throw new Error('Failed to fetch composite meals');
      return res.json();
    },
  });

  const foods = foodList?.pages.flatMap(page => page.data) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Food Database</h1>
            <p className="text-muted-foreground">500+ Indian foods with carb counts and GI values</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="card">
          <div className="card-content pt-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search foods... (rajma, dosa, चावल, રોટલી...)"
                className="input pl-12 pr-4 py-3 text-lg"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card animate-slide-down">
            <div className="card-content pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="input">
                    <option value="all">All Categories</option>
                    {FOOD_CATEGORIES.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Region</label>
                  <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} className="input">
                    {REGIONS.map(reg => (
                      <option key={reg} value={reg}>{reg === 'all' ? 'All Regions' : reg.charAt(0).toUpperCase() + reg.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meal Type</label>
                  <select value={selectedMealType} onChange={e => setSelectedMealType(e.target.value)} className="input">
                    <option value="all">All Meals</option>
                    {MEAL_TYPES.map(mt => (
                      <option key={mt} value={mt}>{mt.charAt(0).toUpperCase() + mt.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setSelectedCategory('all'); setSelectedRegion('all'); setSelectedMealType('all'); }} className="btn-outline w-full">Clear Filters</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'search', label: 'Search Results', icon: Search, count: searchResults?.length },
            { id: 'browse', label: 'Browse All', icon: Grid, count: foods.length },
            { id: 'favorites', label: 'Favorites', icon: Heart, count: 0 },
            { id: 'composite', label: 'Composite Meals', icon: Utensils, count: compositeMeals?.length },
            { id: 'categories', label: 'Categories', icon: Tag, count: FOOD_CATEGORIES.length - 1 },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="badge badge-outline ml-1">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''
              )}
              aria-label="List view"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''
              )}
              aria-label="Grid view"
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Content */}
        <div className="animate-fade-in">
          {activeTab === 'search' && (
            <SearchResults
              results={searchResults || []}
              isLoading={searchLoading}
              viewMode={viewMode}
              onEmpty={() => setActiveTab('browse')}
            />
          )}
          {activeTab === 'browse' && (
            <FoodList
              foods={foods}
              isLoading={listLoading}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              viewMode={viewMode}
            />
          )}
          {activeTab === 'favorites' && (
            <FavoritesList />
          )}
          {activeTab === 'composite' && (
            <CompositeMealsList meals={compositeMeals || []} isLoading={compositeLoading} />
          )}
          {activeTab === 'categories' && (
            <CategoriesList />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function SearchResults({ results, isLoading, viewMode, onEmpty }: {
  results: any[];
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  onEmpty: () => void;
}) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="animate-pulse space-y-4">
            {[1,2,3,4,5].map(i => (
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

  if (results.length === 0) {
    return (
      <div className="card">
        <div className="card-content text-center py-12">
          <p className="text-muted-foreground mb-4">No results found</p>
          <button onClick={onEmpty} className="btn-primary">Browse All Foods</button>
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((food) => <FoodCard key={food.id} food={food} />)}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {results.map((food) => <FoodRow key={food.id} food={food} />)}
      </div>
    </div>
  );
}

function FoodList({ foods, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, viewMode }: {
  foods: any[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  viewMode: 'grid' | 'list';
}) {
  if (isLoading && foods.length === 0) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="animate-pulse space-y-4">
            {[1,2,3,4,5].map(i => (
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

  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {foods.map((food) => <FoodCard key={food.id} food={food} />)}
        </div>
        {hasNextPage && (
          <div className="text-center pt-4">
            <button
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
              className="btn-outline"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More Foods'}
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {foods.map((food) => <FoodRow key={food.id} food={food} />)}
        </div>
      </div>
      {hasNextPage && (
        <div className="text-center pt-4">
          <button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            className="btn-outline"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More Foods'}
          </button>
        </div>
      )}
    </>
  );
}

function FoodCard({ food }: { food: any }) {
  const categoryColors = {
    cereal: 'bg-yellow-100 text-yellow-700',
    pulse: 'bg-orange-100 text-orange-700',
    vegetable: 'bg-green-100 text-green-700',
    fruit: 'bg-pink-100 text-pink-700',
    dairy: 'bg-blue-100 text-blue-700',
    meat: 'bg-red-100 text-red-700',
    fish: 'bg-teal-100 text-teal-700',
    fat: 'bg-amber-100 text-amber-700',
    sweet: 'bg-pink-100 text-pink-700',
    composite: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="card p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className={cn(
          'badge text-xs',
          categoryColors[food.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-700'
        )}>
          {food.category?.charAt(0).toUpperCase() + food.category?.slice(1)}
        </span>
        <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Add to favorites">
          <Heart className="w-4 h-4 text-gray-400 hover:text-red-500" />
        </button>
      </div>
      <h3 className="font-semibold text-lg mb-1">{food.name}</h3>
      {food.nameLocalized && food.nameLocalized !== food.name && (
        <p className="text-sm text-muted-foreground mb-2">{food.nameLocalized}</p>
      )}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-bold text-primary-600">{food.carbsPer100g}g carbs</span>
        <span className="text-muted-foreground">/100g</span>
      </div>
      {food.typicalServingG && (
        <p className="text-xs text-muted-foreground mt-2">
          Typical serving: {food.typicalServingG}g
        </p>
      )}
      {food.glycemicIndex && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-medium">GI:</span>
          <span className={cn(
            'badge text-xs',
            food.glycemicIndex <= 55 ? 'bg-green-100 text-green-700' :
            food.glycemicIndex <= 69 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          )}>
            {food.glycemicIndex}
          </span>
        </div>
      )}
    </div>
  );
}

function FoodRow({ food }: { food: any }) {
  const getGIColor = (gi: number) => {
    if (gi <= 55) return 'bg-green-100 text-green-700';
    if (gi <= 69) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Utensils className="w-6 h-6 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{food.name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {food.category} • {food.carbsPer100g}g carbs/100g
          {food.typicalServingG && ` • ${food.typicalServingG}g serving`}
        </p>
      </div>
      <div className="flex items-center gap-4 text-right">
        <div className="text-right">
          <p className="font-bold text-primary-600">{food.carbsPer100g}g</p>
          <p className="text-xs text-muted-foreground">carbs/100g</p>
        </div>
        {food.glycemicIndex && (
          <span className={cn('badge text-xs', getGIColor(food.glycemicIndex))}>
            GI: {food.glycemicIndex}
          </span>
        )}
      </div>
    </div>
  );
}

function FavoritesList() {
  return (
    <div className="card">
      <div className="card-content text-center py-12">
        <Heart className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
        <p className="text-muted-foreground mb-4">Tap the heart icon on any food to add it here</p>
      </div>
    </div>
  );
}

function CompositeMealsList({ meals, isLoading }: { meals: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="animate-pulse space-y-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="p-3 border-b">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meals.map((meal) => (
        <CompositeMealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );
}

function CompositeMealCard({ meal }: { meal: any }) {
  return (
    <div className="card p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{meal.nameEn || meal.name_en}</h3>
            {meal.nameHi && <span className="text-sm text-muted-foreground">({meal.nameHi})</span>}
            <span className="badge badge-outline text-xs">{meal.mealTypeTags?.[0] || 'Meal'}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{meal.description}</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-primary-600 font-medium">{meal.totalCarbsG}g carbs</span>
            <span className="text-muted-foreground">{meal.totalProteinG?.toFixed(1) || 0}g protein</span>
            <span className="text-muted-foreground">{meal.totalFatG?.toFixed(1) || 0}g fat</span>
            {meal.estimatedGi && (
              <span className={cn('badge text-xs', meal.estimatedGi <= 55 ? 'bg-green-100 text-green-700' : meal.estimatedGi <= 69 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                GI: {meal.estimatedGi}
              </span>
            )}
          </div>
        </div>
        <button className="btn-primary">Add to Meal</button>
      </div>
    </div>
  );
}

function CategoriesList() {
  const categoryIcons: Record<string, string> = {
    cereal: '🌾',
    pulse: '🫘',
    vegetable: '🥦',
    fruit: '🍎',
    dairy: '🥛',
    meat: '🥩',
    fish: '🐟',
    fat: '🧈',
    sweet: '🍬',
    beverage: '🥤',
    condiment: '🧂',
    composite: '🍽️',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {FOOD_CATEGORIES.filter(c => c !== 'all').map((cat) => (
        <div key={cat} className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{categoryIcons[cat] || '🍽️'}</span>
            <div>
              <h3 className="font-semibold text-lg">{cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
              <p className="text-sm text-muted-foreground">Browse {cat} foods</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}