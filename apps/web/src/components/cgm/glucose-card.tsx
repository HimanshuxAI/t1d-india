'use client';

import { cn } from '@/lib/utils';
import { Activity, ArrowRight, ArrowUpRight, ArrowDownRight, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';

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
      <div className="card p-6" suppressHydrationWarning>
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[#FAF4E8] dark:bg-[#2A2536] rounded-lg w-1/3" />
          <div className="h-20 bg-[#FAF4E8] dark:bg-[#2A2536] rounded-2xl w-1/2" />
          <div className="h-4 bg-[#FAF4E8] dark:bg-[#2A2536] rounded-lg w-2/3" />
        </div>
      </div>
    );
  }

  // Clinical color mapping
  const getClinicalInfo = (val: number) => {
    if (val < 54) {
      return {
        label: 'Very Low · Danger',
        color: '#8E1B2E',
        badgeBg: 'bg-[#8E1B2E]/10 text-[#8E1B2E] border-[#8E1B2E]/30',
        ring: 'ring-[#8E1B2E]/20',
      };
    }
    if (val < 70) {
      return {
        label: 'Low · Hypo Alert',
        color: '#D64045',
        badgeBg: 'bg-[#D64045]/10 text-[#D64045] border-[#D64045]/30',
        ring: 'ring-[#D64045]/20',
      };
    }
    if (val > 250) {
      return {
        label: 'Very High · Check Ketones',
        color: '#C46A1C',
        badgeBg: 'bg-[#C46A1C]/10 text-[#C46A1C] border-[#C46A1C]/30',
        ring: 'ring-[#C46A1C]/20',
      };
    }
    if (val > 180) {
      return {
        label: 'High · Post-Meal Peak',
        color: '#E8A33D',
        badgeBg: 'bg-[#E8A33D]/10 text-[#A45D18] border-[#E8A33D]/30',
        ring: 'ring-[#E8A33D]/20',
      };
    }
    return {
      label: 'Target Range · 70-180 mg/dL',
      color: '#2E8B57',
      badgeBg: 'bg-[#2E8B57]/10 text-[#2E8B57] border-[#2E8B57]/30',
      ring: 'ring-[#2E8B57]/20',
    };
  };

  const clinical = getClinicalInfo(glucose);

  // Trend icon & verbal explanation
  const renderTrend = () => {
    if (trendArrow === 'double_up' || (trend !== null && trend >= 2)) {
      return { icon: ArrowUp, text: 'Rising rapidly (>2 mg/dL/min)', color: 'text-[#E8A33D]' };
    }
    if (trendArrow === 'single_up' || (trend !== null && trend === 1)) {
      return { icon: ArrowUpRight, text: 'Slowly rising (1-2 mg/dL/min)', color: 'text-[#E8A33D]' };
    }
    if (trendArrow === 'single_down' || (trend !== null && trend === -1)) {
      return { icon: ArrowDownRight, text: 'Slowly falling (1-2 mg/dL/min)', color: 'text-[#D64045]' };
    }
    if (trendArrow === 'double_down' || (trend !== null && trend <= -2)) {
      return { icon: ArrowDown, text: 'Falling rapidly (>2 mg/dL/min)', color: 'text-[#8E1B2E]' };
    }
    return { icon: ArrowRight, text: 'Stable (<1 mg/dL/min change)', color: 'text-[#2E8B57]' };
  };

  const trendInfo = renderTrend();
  const TrendIcon = trendInfo.icon;

  // Deterministic 6-hour historical points for realistic Indian T1D CGM curve (mg/dL)
  // Reflects breakfast spike after poha + chai, returning smoothly to 108
  const historicalCGM = [
    { time: '-6h', val: 98 },
    { time: '-5.5h', val: 104 },
    { time: '-5h', val: 112 },
    { time: '-4.5h', val: 142 },
    { time: '-4h', val: 168 }, // Post-breakfast peak
    { time: '-3.5h', val: 154 },
    { time: '-3h', val: 132 },
    { time: '-2.5h', val: 120 },
    { time: '-2h', val: 114 },
    { time: '-1.5h', val: 106 },
    { time: '-1h', val: 102 },
    { time: '-30m', val: 105 },
    { time: 'Now', val: 108 },
  ];

  // Map to SVG coordinates (width 400, height 100, min 40, max 240)
  const svgPoints = historicalCGM
    .map((pt, i) => {
      const x = (i / (historicalCGM.length - 1)) * 380 + 10;
      const y = 90 - ((pt.val - 50) / 180) * 80;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="card p-6 sm:p-7 relative overflow-hidden bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_2px_12px_rgba(35,31,43,0.04)]" suppressHydrationWarning>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2A3F8F]/10 dark:bg-[#7F93E6]/20 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-xl text-[#231F2B] dark:text-[#F3EEE4] leading-tight">
              Glucose Profile
            </h3>
            <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">Live continuous sensor stream</p>
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF4E8] dark:bg-[#1A1622] text-[#231F2B] dark:text-[#F3EEE4] border border-[#231F2B]/10 dark:border-white/10">
              Avg <strong>{stats.avgGlucose}</strong> mg/dL
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF4E8] dark:bg-[#1A1622] text-[#231F2B] dark:text-[#F3EEE4] border border-[#231F2B]/10 dark:border-white/10">
              GMI <strong>{stats.gmi}%</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF4E8] dark:bg-[#1A1622] text-[#231F2B] dark:text-[#F3EEE4] border border-[#231F2B]/10 dark:border-white/10">
              CV <strong>{stats.cv}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Glucose Display */}
      <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div
              className="font-serif text-8xl font-black tracking-tight leading-none"
              style={{ color: clinical.color }}
            >
              {glucose}
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] ml-1">
              mg / dL
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border tracking-wide', clinical.badgeBg)}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: clinical.color }} />
              <span>{clinical.label}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5C5665] dark:text-[#8C8496]">
              <TrendIcon className={cn('w-4 h-4', trendInfo.color)} />
              <span>{trendInfo.text}</span>
            </div>
          </div>
        </div>

        {stats && (
          <div className="flex md:flex-col items-end gap-1.5 p-3 rounded-2xl bg-[#FAF4E8] dark:bg-[#1A1622] border border-[#231F2B]/10 dark:border-white/10 w-full md:w-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496]">
              Time in Range
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-2xl font-black text-[#2E8B57]">
                {stats.timeInRange.inRange.toFixed(1)}%
              </span>
              <span className="text-xs text-[#5C5665] dark:text-[#8C8496]">target &gt;70%</span>
            </div>
          </div>
        )}
      </div>

      {/* 6-Hour Trajectory Chart */}
      <div className="mt-2 pt-4 border-t border-[#231F2B]/[0.08] dark:border-white/[0.08]">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-semibold text-[#231F2B] dark:text-[#F3EEE4] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2E8B57]" />
            6-Hour Continuous Trajectory
          </span>
          <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">
            Target Band: 70 – 180 mg/dL
          </span>
        </div>

        <div className="relative h-28 w-full bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 rounded-xl p-2 border border-[#231F2B]/5">
          {/* SVG Sparkline */}
          <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
            {/* Shaded Target Band 70-180 mg/dL */}
            <rect x="0" y="25" width="400" height="48" fill="#2E8B57" fillOpacity="0.08" />
            
            {/* Target guidelines */}
            <line x1="0" y1="25" x2="400" y2="25" stroke="#E8A33D" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
            <line x1="0" y1="73" x2="400" y2="73" stroke="#D64045" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />

            {/* Glucose Trend Path */}
            <polyline
              fill="none"
              stroke="#2A3F8F"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgPoints}
            />

            {/* Current point pulsing dot */}
            <circle cx="390" cy="58" r="4.5" fill="#2E8B57" stroke="#FAF4E8" strokeWidth="2" />
          </svg>

          {/* Time axis marks */}
          <div className="flex justify-between text-[10px] font-bold text-[#8C8496] mt-1 px-1">
            <span>6h ago (Poha)</span>
            <span>4h ago (Peak)</span>
            <span>2h ago</span>
            <span className="text-[#2A3F8F] dark:text-[#7F93E6]">Now (108 mg/dL)</span>
          </div>
        </div>
      </div>
    </div>
  );
}