'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { cn, formatTimeAgo } from '@/lib/utils';
import {
  Syringe, Pill, Droplet, Calendar, Filter, ChevronDown,
  Download, RefreshCw, Clock, MapPin, Trash2, Edit, AlertTriangle, Utensils
} from 'lucide-react';

interface InsulinLog {
  id: string;
  administeredAt: string;
  insulinType: string;
  doseU: number;
  injectionSite: string;
  relatedMealLog?: {
    id: string;
    mealTime: string;
    totalCarbsG: number;
  } | null;
  glucoseAtInjection?: number;
  carbEstimateG?: number;
  calculatorRecommendedU?: number;
  overrideReason?: string;
  deliveryMethod: string;
  deviceId?: string;
  loggedAt: string;
}

interface InsulinHistoryProps {
  initialFilters?: {
    insulinType?: string;
    dateRange?: string;
  };
}

export function InsulinHistory({ initialFilters }: InsulinHistoryProps) {
  const [filters, setFilters] = useState({
    insulinType: initialFilters?.insulinType || 'all',
    dateRange: initialFilters?.dateRange || 'week',
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery({
    queryKey: ['insulin', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(filters.insulinType !== 'all' && { insulinType: filters.insulinType.toUpperCase() }),
        ...(filters.dateRange !== 'all' && { startDate: getStartDate(filters.dateRange) }),
      });
      const res = await fetch(`/api/v1/insulin?${params}`);
      if (!res.ok) throw new Error('Failed to fetch insulin logs');
      return res.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNext) return lastPage.pagination.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  const logs = data?.pages.flatMap(page => page.data) || [];

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const getInsulinIcon = (type: string) => {
    if (type.includes('RAPID')) return <Syringe className="w-4 h-4 text-blue-500" />;
    if (type.includes('REGULAR')) return <Pill className="w-4 h-4 text-orange-500" />;
    if (type.includes('NPH')) return <Pill className="w-4 h-4 text-amber-500" />;
    if (type.includes('PREMIXED')) return <Pill className="w-4 h-4 text-purple-500" />;
    if (type.includes('GLARGINE') || type.includes('DEGLUDEC') || type.includes('BASAL_PUMP')) return <Droplet className="w-4 h-4 text-green-500" />;
    return <Syringe className="w-4 h-4 text-gray-500" />;
  };

  const getInsulinLabel = (type: string) => {
    const labels: Record<string, string> = {
      'RAPID_LISPRO': 'Lispro (Rapid)',
      'RAPID_ASPART': 'Aspart (Rapid)',
      'RAPID_GLULISINE': 'Glulisine (Rapid)',
      'REGULAR_HUMAN': 'Regular (Human)',
      'NPH_HUMAN': 'NPH (Human)',
      'PREMIXED_30_70': 'Premixed 30/70',
      'PREMIXED_50_50': 'Premixed 50/50',
      'PREMIXED_25_75': 'Premixed 25/75',
      'GLARGINE_U100': 'Glargine U100',
      'GLARGINE_U300': 'Glargine U300',
      'DEGLUDEC_U100': 'Degludec U100',
      'DEGLUDEC_U200': 'Degludec U200',
      'BASAL_PUMP': 'Pump Basal',
    };
    return labels[type] || type;
  };

  const getSiteLabel = (site: string) => {
    const labels: Record<string, string> = {
      'ABDOMEN': 'Abdomen',
      'THIGH': 'Thigh',
      'ARM': 'Arm',
      'BUTTOCK': 'Buttock',
      'PUMP_SITE': 'Pump Site',
    };
    return labels[site] || site;
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
          <p className="text-red-600">Failed to load insulin logs</p>
          <button onClick={() => refetch()} className="mt-2 btn-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Insulin History</h2>
          <p className="text-muted-foreground">Your insulin injections and doses</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-outline">
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
                <label className="block text-sm font-medium mb-1">Insulin Type</label>
                <select
                  value={filters.insulinType}
                  onChange={(e) => setFilters({ ...filters, insulinType: e.target.value, page: 1 })}
                  className="input"
                >
                  <option value="all">All Types</option>
                  <optgroup label="Rapid-Acting">
                    <option value="RAPID_LISPRO">Lispro (Humalog)</option>
                    <option value="RAPID_ASPART">Aspart (Novolog)</option>
                    <option value="RAPID_GLULISINE">Glulisine (Apidra)</option>
                  </optgroup>
                  <optgroup label="Short-Acting">
                    <option value="REGULAR_HUMAN">Regular Human</option>
                  </optgroup>
                  <optgroup label="Intermediate">
                    <option value="NPH_HUMAN">NPH (Isophane)</option>
                  </optgroup>
                  <optgroup label="Premixed">
                    <option value="PREMIXED_30_70">30/70</option>
                    <option value="PREMIXED_50_50">50/50</option>
                    <option value="PREMIXED_25_75">25/75</option>
                  </optgroup>
                  <optgroup label="Long-Acting">
                    <option value="GLARGINE_U100">Glargine U100</option>
                    <option value="GLARGINE_U300">Glargine U300</option>
                    <option value="DEGLUDEC_U100">Degludec U100</option>
                    <option value="DEGLUDEC_U200">Degludec U200</option>
                  </optgroup>
                  <optgroup label="Pump">
                    <option value="BASAL_PUMP">Pump Basal</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value, page: 1 })}
                  className="input"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={() => setFilters({ insulinType: 'all', dateRange: 'week' })}
                  className="btn-outline"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insulin logs */}
      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <div className="card-content text-center py-12">
            <Syringe className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">No insulin logs found</h3>
            <p className="text-muted-foreground mb-4">
              Start logging your insulin doses to track your regimen
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.map((log) => (
                <InsulinLogRow key={log.id} log={log} />
              ))}
            </div>

            {hasNextPage && (
              <div className="p-4 border-t">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full btn-outline"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InsulinLogRow({ log }: { log: InsulinLog }) {
  const time = new Date(log.administeredAt);
  const loggedTime = new Date(log.loggedAt);

  const getTypeColor = (type: string) => {
    if (type.includes('RAPID')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (type.includes('REGULAR')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    if (type.includes('NPH')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    if (type.includes('PREMIXED')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    if (type.includes('GLARGINE') || type.includes('DEGLUDEC') || type.includes('BASAL_PUMP')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Dose */}
        <div className="flex-shrink-0 w-20 text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {log.doseU.toFixed(1)} U
          </div>
        </div>

        {/* Type & info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              (() => {
                const type = log.insulinType;
                if (type.includes('RAPID')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
                if (type.includes('REGULAR')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
                if (type.includes('NPH')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
                if (type.includes('PREMIXED')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
                if (type.includes('GLARGINE') || type.includes('DEGLUDEC') || type.includes('BASAL_PUMP')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
                return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
              })()
            )}>
              {getInsulinLabel(log.insulinType)}
            </span>
            <span className="text-sm text-muted-foreground">
              {new Date(log.administeredAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-sm text-muted-foreground">
              {new Date(log.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-xs text-muted-foreground">
              Logged {formatTimeAgo(new Date(log.loggedAt))}
            </span>
          </div>

          {/* Details */}
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {log.injectionSite.charAt(0) + log.injectionSite.slice(1).toLowerCase()}
            </span>
            {log.deliveryMethod && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Syringe className="w-3.5 h-3.5 text-muted-foreground" /> {log.deliveryMethod.charAt(0) + log.deliveryMethod.slice(1).toLowerCase()}
              </span>
            )}
            {log.glucoseAtInjection && (
              <span className="flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-[#2E8B57]" /> {log.glucoseAtInjection} mg/dL
              </span>
            )}
            {log.carbEstimateG && (
              <span className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-muted-foreground" /> ~{Math.round(log.carbEstimateG)}g carbs
              </span>
            )}
            {log.calculatorRecommendedU && log.calculatorRecommendedU !== log.doseU && (
              <span className="flex items-center gap-1.5 text-orange-600">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> Calculator: {log.calculatorRecommendedU.toFixed(1)}U
              </span>
            )}
            {log.overrideReason && (
              <span className="text-orange-600 text-xs">
                Override: {log.overrideReason}
              </span>
            )}
          </div>

          {log.relatedMealLog && (
            <div className="mt-2 p-2 bg-[#FAF4E8] dark:bg-[#1E1926] rounded-lg border border-[#231F2B]/10 dark:border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <Utensils className="w-4 h-4 text-[#2A3F8F] dark:text-[#7F93E6]" />
                <span>Meal: {Math.round(log.relatedMealLog.totalCarbsG)}g carbs</span>
                <span className="text-muted-foreground">
                  {new Date(log.relatedMealLog.mealTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}

          {log.overrideReason && (
            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Override reason:</strong> {log.overrideReason}
              </p>
            </div>
          )}
        </div>

        {/* Dose display */}
        <div className="flex-shrink-0 text-right">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {log.doseU.toFixed(1)} U
          </div>
        </div>
      </div>
    </div>
  );
}