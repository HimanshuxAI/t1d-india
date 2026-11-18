'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight, Download, Syringe, Pill, Droplet, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';

interface DailyInsulinSummary {
  date: string;
  totals: {
    rapid: number;
    regular: number;
    nph: number;
    premixed: number;
    basal: number;
    total: number;
  };
  injections: number;
  logs: Array<{
    time: string;
    type: string;
    doseU: number;
    site: string;
  }>;
}

export function InsulinSummary() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['insulin', 'summary', 'daily', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const res = await fetch(`/api/v1/insulin/summary/daily?date=${selectedDate.toISOString().split('T')[0]}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
  });

  const navigateDay = (days: number) => {
    setSelectedDate(prev => new Date(prev.getTime() + days * 24 * 60 * 60 * 1000));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse">
          <div className="card-content">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="card-content text-center py-8">
            <p className="text-muted-foreground">No insulin data for this date</p>
          </div>
        </div>
      </div>
    );
  }

  const { totals, injections, logs } = summary;

  return (
    <div className="space-y-6">
      {/* Date navigator */}
      <div className="card">
        <div className="card-content pt-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDay(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h3 className="text-xl font-semibold">{formatDate(selectedDate)}</h3>
              {isToday && <span className="badge badge-primary text-xs ml-2">Today</span>}
            </div>
            <button
              onClick={() => navigateDay(1)}
              disabled={isToday}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isToday ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Totals cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <TotalCard
          label="Total"
          value={totals.total.toFixed(1)}
          unit="U"
          icon={Syringe}
          color="primary"
          trend={null}
        />
        <TotalCard
          label="Rapid"
          value={totals.rapid.toFixed(1)}
          unit="U"
          icon={Syringe}
          color="blue"
        />
        <TotalCard
          label="Regular"
          value={totals.regular.toFixed(1)}
          unit="U"
          icon={Pill}
          color="orange"
        />
        <TotalCard
          label="NPH"
          value={totals.nph.toFixed(1)}
          unit="U"
          icon={Pill}
          color="amber"
        />
        <TotalCard
          label={totals.premixed > 0 ? 'Premixed' : 'Basal'}
          value={(totals.premixed + totals.basal).toFixed(1)}
          unit="U"
          icon={Droplet}
          color="green"
        />
      </div>

      {/* Injection timeline */}
      <div className="card">
        <div className="card-header flex flex-row items-center justify-between">
          <div>
            <h3 className="card-title">Injection Timeline</h3>
            <p className="card-description">{injections} injections today</p>
          </div>
        </div>
        <div className="card-content">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No injections logged today</p>
              <p className="text-sm">Log your first dose from the Calculator tab</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <InjectionTimelineItem
                  key={log.time}
                  log={log}
                  isFirst={index === 0}
                  isLast={index === logs.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily insights */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Daily Insights</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InsightCard
              title="Basal Coverage"
              value={totals.basal + totals.nph + totals.premixed > 0 ? 'Adequate' : 'Missing'}
              description={totals.basal + totals.nph + totals.premixed > 0
                ? 'Basal insulin logged'
                : 'No basal insulin logged today'}
              icon={totals.basal + totals.nph + totals.premixed > 0 ? CheckCircle : AlertTriangle}
              color={totals.basal + totals.nph + totals.premixed > 0 ? 'green' : 'red'}
            />
            <InsightCard
              title="Meal Coverage"
              value={totals.rapid + totals.regular > 0 ? `${totals.rapid + totals.regular.toFixed(1)} U` : 'None'}
              description={totals.rapid + totals.regular > 0
                ? 'Bolus insulin for meals'
                : 'No meal bolus logged'}
              icon={totals.rapid + totals.regular > 0 ? CheckCircle : AlertTriangle}
              color={totals.rapid + totals.regular > 0 ? 'green' : 'orange'}
            />
            <InsightCard
              title="Total Dose"
              value={`${totals.total.toFixed(1)} U`}
              description={totals.total <= 50 ? 'Within typical range' : 'High daily dose - review with clinician'}
              icon={totals.total <= 50 ? CheckCircle : AlertTriangle}
              color={totals.total <= 50 ? 'green' : 'orange'}
            />
          </div>
        </div>
      </div>

      {/* Injection details table */}
      <div className="card">
        <div className="card-header flex flex-row items-center justify-between">
          <h3 className="card-title">All Injections</h3>
        </div>
        <div className="card-content p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Dose</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Glucose</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Carbs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.time} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium">{log.time}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="badge badge-outline">{getTypeLabel(log.type)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{log.doseU.toFixed(1)} U</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{log.site}</td>
                    <td className="px-4 py-3 text-sm">
                      {log.type.includes('RAPID') && `<span className="text-muted-foreground">—</span>`}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalCard({ label, value, unit, icon: Icon, color }: {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorMap = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  };

  return (
    <div className="card">
      <div className="card-content pt-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-muted-foreground">{unit}</span>
            </div>
          </div>
          <div className={cn('p-3 rounded-xl', colorMap[color as keyof typeof colorMap] || colorMap.primary)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InjectionTimelineItem({ log, isFirst, isLast }: {
  log: { time: string; type: string; doseU: number; site: string };
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative flex items-start gap-4">
      <div className="relative flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-primary-600 border-2 border-white dark:border-gray-900 z-10" />
        {!isLast && (
          <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 ml-1.5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{log.time}</span>
          <span className="badge badge-outline text-xs">{getTypeLabel(log.type)}</span>
          <span className="font-bold text-primary-600">{log.doseU.toFixed(1)} U</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{log.site}</p>
      </div>
    </div>
  );
}

function InsightCard({ title, value, description, icon: Icon, color }: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorMap = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className={cn('p-3 rounded-xl', colorMap[color as keyof typeof colorMap] || colorMap.green)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-lg font-bold mt-1">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

function getTypeLabel(type: string): string {
  if (type.includes('RAPID')) return 'Rapid';
  if (type.includes('REGULAR')) return 'Regular';
  if (type.includes('NPH')) return 'NPH';
  if (type.includes('PREMIXED')) return 'Premixed';
  if (type.includes('GLARGINE') || type.includes('DEGLUDEC')) return 'Basal';
  if (type.includes('BASAL_PUMP')) return 'Pump';
  return type;
}