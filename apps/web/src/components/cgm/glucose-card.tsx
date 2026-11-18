'use client';

import { cn } from '@/lib/utils';

interface GlucoseCardProps {
  glucose: number | null;
  trend: number | null;
  trendArrow: string | null;
  stats: {
    avgGlucose: number;
    gmi: number;
    cv: number;
    timeInRange: {
      veryLow: number;
      low: number;
      inRange: number;
      high: number;
      veryHigh: number;
    };
  } | null;
  isLoading: boolean;
}

export function GlucoseCard({ glucose, trend, trendArrow, stats, isLoading }: GlucoseCardProps) {
  if (isLoading || glucose === null) {
    return (
      <div className="card">
        <div className="card-content flex items-center justify-center h-48">
          <div className="animate-pulse space-y-4 w-3/4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  const getGlucoseColor = (value: number) => {
    if (value < 54) return 'text-red-600';
    if (value < 70) return 'text-yellow-600';
    if (value > 250) return 'text-red-600';
    if (value > 180) return 'text-orange-600';
    return 'text-green-600';
  };

  const getTrendColor = (trend: number | null) => {
    if (trend === null) return 'text-gray-500';
    if (trend >= 2) return 'text-green-600';
    if (trend >= 1) return 'text-green-500';
    if (trend <= -2) return 'text-red-600';
    if (trend <= -1) return 'text-yellow-600';
    return 'text-gray-500';
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-title">Current Glucose</h3>
            <p className="card-description">Updated just now</p>
          </div>
          {stats && (
            <div className="flex items-center gap-2">
              <span className="badge badge-outline text-xs">Avg: {stats.avgGlucose} mg/dL</span>
              <span className="badge badge-outline text-xs">GMI: {stats.gmi}%</span>
              <span className="badge badge-outline text-xs">CV: {stats.cv}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="card-content">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <div className="text-7xl font-bold" style={{ color: getGlucoseColor(glucose) }}>
              {glucose}
            </div>
            <div className="absolute bottom-0 right-0 transform translate-x-1/2 translate-y-1/2">
              <span className={cn('text-3xl font-bold', getTrendColor(trend))}>
                {trendArrow || '—'}
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">mg/dL</p>
          
          <div className="mt-6 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', getTrendColor(trend))} />
              <span className={cn('font-medium', getTrendColor(trend))}>
                {trend !== null && trend !== 0 ? (trend > 0 ? 'Rising' : 'Falling') : 'Stable'}
              </span>
            </div>
            {stats && (
              <>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="flex items-center gap-1.5 text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium">{stats.timeInRange.inRange.toFixed(1)}% in range</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mini sparkline placeholder */}
        {stats && (
          <div className="mt-6 h-20 relative">
            <div className="absolute inset-0 flex items-end justify-between">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 mx-0.5 bg-gradient-to-t from-green-500 to-green-300 rounded-t"
                  style={{ height: `${20 + Math.random() * 60}%` }}
                />
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
              <span>6h ago</span>
              <span>Now</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}