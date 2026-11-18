'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MealLoggingForm } from '@/components/meal/meal-logging-form';
import { MealHistory } from '@/components/meal/meal-history';
import { QuickActions } from '@/components/meal/quick-actions';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Utensils, Search, Camera, Mic2, Calendar, Clock, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MealsPage() {
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'search'>('log');
  const [filters, setFilters] = useState({
    mealType: 'all',
    dateRange: 'week',
    searchQuery: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meals</h1>
            <p className="text-muted-foreground">Log and track your meals with carb counting</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'btn-outline',
                showFilters && 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700'
              )}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            <Link href="/meals/new" className="btn-primary">
              <Utensils className="w-4 h-4 mr-2" />
              Log Meal
            </Link>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card animate-slide-down">
            <div className="card-content pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Meal Type</label>
                  <select
                    value={filters.mealType}
                    onChange={(e) => setFilters({ ...filters, mealType: e.target.value })}
                    className="input"
                  >
                    <option value="all">All Meals</option>
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
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="input"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Search Foods</label>
                  <input
                    type="text"
                    placeholder="Search rajma, dosa, rice..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { id: 'log', label: 'Log Meal', icon: Utensils },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'search', label: 'Food Search', icon: Search },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in">
          {activeTab === 'log' && (
            <MealLoggingForm onSuccess={() => setActiveTab('history')} />
          )}
          {activeTab === 'history' && (
            <MealHistory
              initialFilters={filters}
              onFiltersChange={setFilters}
            />
          )}
          {activeTab === 'search' && (
            <FoodSearchPage />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function FoodSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState('en');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/v1/foods/search?q=${encodeURIComponent(query)}&locale=${selectedLocale}&limit=20`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Indian Food Database</h3>
          <p className="card-description">Search 500+ Indian foods with regional names</p>
        </div>
        <div className="card-content space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Type food name (rajma, dosa, chawal...)"
                  className="input"
                />
                <button onClick={handleSearch} disabled={isSearching} className="btn-primary">
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value)}
                className="input"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="ta">தமிழ்</option>
                <option value="te">తెలుగు</option>
                <option value="mr">मराठी</option>
                <option value="gu">ગુજરાતી</option>
                <option value="bn">বাংলা</option>
              </select>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">{results.length} results</h4>
              <div className="max-h-96 overflow-y-auto">
                {results.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{food.name}</span>
                        {food.nameLocalized !== food.name && (
                          <span className="text-sm text-muted-foreground">({food.nameLocalized})</span>
                        )}
                        <span className="badge badge-outline text-xs">{food.category}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {food.carbsPer100g}g carbs/100g • {food.typicalServingG}g typical serving
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">{food.carbsPer100g}g</p>
                      <p className="text-xs text-muted-foreground">per 100g</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query && results.length === 0 && !isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No results for "{query}"</p>
              <p className="text-sm">Try Hindi names like "राजमा" or "डोसा"</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick links to popular foods */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Popular Searches</h3>
        </div>
        <div className="card-content">
          <div className="flex flex-wrap gap-2">
            {[
              'Rajma', 'Chole', 'Dal', 'Rice', 'Roti', 'Dosa', 'Idli',
              'Poha', 'Upma', 'Paratha', 'Biryani', 'Khichdi',
              'Banana', 'Mango', 'Milk', 'Curd', 'Paneer'
            ].map((food) => (
              <button
                key={food}
                onClick={() => { setQuery(food); handleSearch(); }}
                className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
              >
                {food}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}