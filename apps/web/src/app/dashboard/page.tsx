'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { GlucoseCard } from '@/components/cgm/glucose-card';
import { HypoAlertBanner } from '@/components/cgm/hypo-alert-banner';
import { QuickActions } from '@/components/meal/quick-actions';
import { InsulinCalculatorCard } from '@/components/insulin/insulin-calculator-card';
import { RecentMeals } from '@/components/meal/recent-meals';
import { useCGM } from '@/hooks/use-cgm';
import { useHypoPredictions } from '@/hooks/use-hypo-predictions';
import { useSyncStatus } from '@/app/providers';
import { Activity, Clock, ShieldCheck, Wifi, Sparkles, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { currentGlucose, trend, trendArrow, stats, isLoading: cgmLoading } = useCGM();
  const { predictions, isLoading: predLoading } = useHypoPredictions();
  const { isOnline, pendingCount, lastSynced } = useSyncStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sync status bar */}
        {mounted && !isOnline && (
          <div className="bg-[#FAF4E8] dark:bg-[#261E16] border border-[#E8A33D]/40 text-[#231F2B] dark:text-[#F3EEE4] px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E8A33D] animate-ping" />
              <span className="text-xs font-semibold">
                Offline Mode Active · Changes and meal logs are saved locally and will auto-sync.
              </span>
            </div>
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E8A33D]/20 text-[#A45D18] px-2.5 py-1 rounded-full">
                {pendingCount} Pending Sync
              </span>
            )}
          </div>
        )}

        {/* Hypo alert banner */}
        <HypoAlertBanner predictions={predictions} />

        {/* Main 2-column Grid */}
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
              <div className="card p-6 bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_2px_12px_rgba(35,31,43,0.04)]">
                <div className="flex items-center justify-between pb-4 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#231F2B] dark:text-[#F3EEE4]">
                      Time in Range (24h)
                    </h3>
                    <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">Target: 70 – 180 mg/dL (&gt;70%)</p>
                  </div>
                  {lastSynced && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF4E8] dark:bg-[#1A1622] text-[#5C5665] dark:text-[#8C8496] border border-[#231F2B]/10" suppressHydrationWarning>
                      {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-5">
                  {/* TIR Visual Bars */}
                  <div className="grid grid-cols-5 gap-2">
                    <StatBar label="Very Low" value={stats.timeInRange.veryLow} hex="#8E1B2E" threshold="<54" />
                    <StatBar label="Low" value={stats.timeInRange.low} hex="#D64045" threshold="54-69" />
                    <StatBar label="In Range" value={stats.timeInRange.inRange} hex="#2E8B57" threshold="70-180" isMain />
                    <StatBar label="High" value={stats.timeInRange.high} hex="#E8A33D" threshold="181-250" />
                    <StatBar label="Very High" value={stats.timeInRange.veryHigh} hex="#C46A1C" threshold=">250" />
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    <div className="p-3 rounded-xl bg-[#FAF4E8] dark:bg-[#1A1622] border border-[#231F2B]/10 dark:border-white/10 text-center">
                      <p className="font-serif text-xl font-bold text-[#2A3F8F] dark:text-[#7F93E6]">
                        {stats.avgGlucose}
                      </p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#5C5665] dark:text-[#8C8496] mt-0.5">
                        Avg mg/dL
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FAF4E8] dark:bg-[#1A1622] border border-[#231F2B]/10 dark:border-white/10 text-center">
                      <p className="font-serif text-xl font-bold text-[#2E8B57]">
                        {stats.gmi}%
                      </p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#5C5665] dark:text-[#8C8496] mt-0.5">
                        Est. HbA1c
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FAF4E8] dark:bg-[#1A1622] border border-[#231F2B]/10 dark:border-white/10 text-center">
                      <p className="font-serif text-xl font-bold text-[#E8A33D]">
                        {stats.cv}%
                      </p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#5C5665] dark:text-[#8C8496] mt-0.5">
                        Variability
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming predictions */}
            {predictions.length > 0 && (
              <div className="card p-6 bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_2px_12px_rgba(35,31,43,0.04)]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4]">
                      Hypo Forecast Horizons
                    </h3>
                    <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">30–60 Min Glucose Trajectory</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF4E8] dark:bg-[#1A1622] text-[#2A3F8F] dark:text-[#7F93E6]">
                    Next 60m
                  </span>
                </div>

                <div className="space-y-2.5">
                  {predictions.map((pred) => (
                    <div
                      key={pred.horizonMin}
                      className="p-3.5 rounded-xl bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#231F2B] dark:text-[#F3EEE4]">
                            +{pred.horizonMin} Minutes
                          </span>
                          <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">
                            (Median: {pred.glucoseP50} mg/dL)
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5C5665] dark:text-[#8C8496] mt-0.5">
                          Band: {pred.glucoseP10} – {pred.glucoseP90} mg/dL
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-serif text-lg font-black ${
                            pred.hypoProbability > 0.4
                              ? 'text-[#D64045]'
                              : pred.hypoProbability > 0.2
                              ? 'text-[#E8A33D]'
                              : 'text-[#2E8B57]'
                          }`}
                        >
                          {Math.round(pred.hypoProbability * 100)}%
                        </span>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-[#5C5665] dark:text-[#8C8496]">
                          Hypo Risk
                        </p>
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

function StatBar({
  label,
  value,
  hex,
  threshold,
  isMain,
}: {
  label: string;
  value: number;
  hex: string;
  threshold: string;
  isMain?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full h-24 relative bg-[#FAF4E8] dark:bg-[#1A1622] rounded-xl p-1 border border-[#231F2B]/10 dark:border-white/10 flex flex-col justify-end overflow-hidden">
        <div
          className="w-full rounded-lg transition-all duration-300"
          style={{
            height: `${Math.max(value, 6)}%`,
            backgroundColor: hex,
          }}
        />
      </div>
      <p className={`text-[11px] font-bold mt-1.5 ${isMain ? 'text-[#2E8B57]' : 'text-[#231F2B] dark:text-[#F3EEE4]'}`}>
        {value.toFixed(1)}%
      </p>
      <p className="text-[10px] text-[#5C5665] dark:text-[#8C8496] font-medium leading-none mt-0.5">
        {label}
      </p>
      <p className="text-[9px] text-[#8C8496] mt-0.5">{threshold}</p>
    </div>
  );
}