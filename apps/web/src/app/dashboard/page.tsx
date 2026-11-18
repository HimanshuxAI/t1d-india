'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { GlucoseCard } from '@/components/cgm/glucose-card';
import { HypoAlertBanner } from '@/components/cgm/hypo-alert-banner';
import { QuickActions } from '@/components/meal/quick-actions';
import { InsulinCalculatorCard } from '@/components/insulin/insulin-calculator-card';
import { RecentMeals } from '@/components/meal/recent-meals';
import { useCGM } from '@/hooks/use-cgm';
import { useHypoPredictions } from '@/hooks/use-hypo-predictions';
import { useSyncStatus } from '@/app/providers';

export default function DashboardPage() {
  const { currentGlucose, trend, trendArrow, stats, isLoading: cgmLoading } = useCGM();
  const { predictions, isLoading: predLoading } = useHypoPredictions();
  const { isOnline, pendingCount, lastSynced } = useSyncStatus();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sync status bar */}
        {!isOnline && (
          <div className="bg-warning-100 border border-warning-300 text-warning-800 px-4 py-2 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-sm font-medium">You're offline. Changes will sync when connected.</span>
            </div>
            {pendingCount > 0 && (
              <span className="text-xs bg-warning-300 px-2 py-1 rounded">{pendingCount} pending</span>
            )}
          </div>
        )}

        {/* Hypo alert banner */}
        <HypoAlertBanner predictions={predictions} />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - CGM & Insulin */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current glucose card */}
            <GlucoseCard
              glucose={currentGlucose}
              trend={trend}
              trendArrow={trendArrow}
              stats={stats}
              isLoading={cgmLoading}
            />

            {/* Insulin calculator */}
            <InsulinCalculatorCard currentGlucose={currentGlucose} />

            {/* Recent meals */}
            <RecentMeals />
          </div>

          {/* Right column - Quick actions & Stats */}
          <div className="space-y-6">
            <QuickActions />
            
            {/* Time in range stats */}
            {stats && (
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="card-title">Time in Range (24h)</h3>
                      <p className="card-description">Target: 70-180 mg/dL</p>
                    </div>
                    {lastSynced && (
                      <span className="badge badge-outline text-xs">
                        Synced {new Date(lastSynced).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-content space-y-4">
                  <div className="grid grid-cols-5 gap-2">
                    <StatBar label="Very Low" value={stats.timeInRange.veryLow} color="bg-red-500" threshold="<54" />
                    <StatBar label="Low" value={stats.timeInRange.low} color="bg-yellow-500" threshold="70-54" />
                    <StatBar label="In Range" value={stats.timeInRange.inRange} color="bg-green-500" threshold="70-180" />
                    <StatBar label="High" value={stats.timeInRange.high} color="bg-orange-500" threshold="180-250" />
                    <StatBar label="Very High" value={stats.timeInRange.veryHigh} color="bg-red-600" threshold=">250" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="text-2xl font-bold text-primary-600">{stats.avgGlucose}</p>
                      <p className="text-xs text-muted-foreground">Avg Glucose</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="text-2xl font-bold text-secondary-600">{stats.gmi}%</p>
                      <p className="text-xs text-muted-foreground">GMI</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="text-2xl font-bold text-warning-600">{stats.cv}%</p>
                      <p className="text-xs text-muted-foreground">CV</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming predictions */}
            {predictions.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Hypo Predictions</h3>
                  <p className="card-description">Next 60 minutes</p>
                </div>
                <div className="card-content space-y-3">
                  {predictions.map((pred) => (
                    <div key={pred.horizonMin} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="font-medium">{pred.horizonMin} min</p>
                        <p className="text-sm text-muted-foreground">
                          {pred.glucoseP10}-{pred.glucoseP90} mg/dL (median: {pred.glucoseP50})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          pred.hypoProbability > 0.5 ? 'text-red-600' :
                          pred.hypoProbability > 0.2 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {Math.round(pred.hypoProbability * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Hypo risk</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatBar({ label, value, color, threshold }: { label: string; value: number; color: string; threshold: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full h-24 relative">
        <div
          className={`absolute bottom-0 w-full rounded-t ${color}`}
          style={{ height: `${value}%` }}
        />
        <div className="absolute top-0 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700 rounded-t" />
      </div>
      <p className="text-xs font-medium mt-1">{label}</p>
      <p className="text-xs text-muted-foreground">{value.toFixed(1)}%</p>
      <p className="text-[10px] text-muted-foreground">{threshold}</p>
    </div>
  );
}