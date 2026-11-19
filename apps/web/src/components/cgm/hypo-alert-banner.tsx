'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ShieldAlert, AlertCircle, Info, X, Clock, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

interface HypoPrediction {
  horizonMin: number;
  glucoseP10: number;
  glucoseP50: number;
  glucoseP90: number;
  hypoProbability: number;
  severeHypoProbability: number;
  topFeatures: Array<{ feature: string; contribution: number }>;
  predictedAt: string;
  modelVersion: string;
}

interface HypoAlertBannerProps {
  predictions: HypoPrediction[];
}

export function HypoAlertBanner({ predictions }: HypoAlertBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || dismissed || !predictions || predictions.length === 0) return null;

  // Find the most urgent prediction
  const urgentPrediction = predictions.find(p => p.hypoProbability > 0.5 || p.severeHypoProbability > 0.3);
  const warningPrediction = predictions.find(p => p.hypoProbability > 0.2);
  const prediction = urgentPrediction || warningPrediction;

  if (!prediction) return null;

  const isSevere = prediction.severeHypoProbability > 0.3;
  const isUrgent = prediction.hypoProbability > 0.5 || isSevere;

  const getAlertConfig = () => {
    if (isSevere) {
      return {
        icon: ShieldAlert,
        border: 'border-[#8E1B2E]/30',
        bg: 'bg-[#FDF2F2] dark:bg-[#2A1519]',
        accent: 'bg-[#8E1B2E]',
        badge: 'text-[#8E1B2E] bg-[#8E1B2E]/10 border-[#8E1B2E]/20',
        title: 'Severe Hypoglycemia Warning',
        subtitle: `Clinical trajectory forecasts glucose dropping below 54 mg/dL in ~${prediction.horizonMin} minutes.`,
      };
    }
    if (isUrgent) {
      return {
        icon: AlertCircle,
        border: 'border-[#D64045]/30',
        bg: 'bg-[#FFF5F5] dark:bg-[#29181B]',
        accent: 'bg-[#D64045]',
        badge: 'text-[#D64045] bg-[#D64045]/10 border-[#D64045]/20',
        title: 'Impending Hypoglycemia Risk',
        subtitle: `High likelihood of glucose dropping below 70 mg/dL in ~${prediction.horizonMin} minutes.`,
      };
    }
    return {
      icon: Info,
      border: 'border-[#E8A33D]/30',
      bg: 'bg-[#FFFBF2] dark:bg-[#261E16]',
      accent: 'bg-[#E8A33D]',
      badge: 'text-[#A45D18] dark:text-[#E8A33D] bg-[#E8A33D]/10 border-[#E8A33D]/20',
      title: 'Hypoglycemia Watch Advisory',
      subtitle: `TFT Trend Analysis indicates downward slope toward ~${prediction.glucoseP50} mg/dL in ${prediction.horizonMin} min.`,
    };
  };

  const config = getAlertConfig();
  const Icon = config.icon;

  const desiFastCarbs = [
    { name: 'Glucovita / Glucose Tabs', qty: '3-4 tabs', carbs: '15g' },
    { name: 'Fresh Mosambi / Fruit Juice', qty: '150-200 ml', carbs: '15g' },
    { name: 'Desi Gur (Jaggery)', qty: '1 tbsp / piece', carbs: '14g' },
    { name: 'Khajoor (Dates)', qty: '2-3 pieces', carbs: '15g' },
    { name: 'Kishmish (Raisins)', qty: '1 tbsp (15g)', carbs: '12g' },
    { name: 'White Sugar in Water', qty: '1 tbsp (12g)', carbs: '12g' },
  ];

  return (
    <div className={cn('relative rounded-2xl border p-5 sm:p-6 shadow-sm overflow-hidden transition-all', config.bg, config.border)}>
      {/* Top accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1', config.accent)} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white', config.accent)}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider', config.badge)}>
                {prediction.horizonMin}m Forecast · {Math.round(prediction.hypoProbability * 100)}% Risk
              </span>
              <span className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                Model: {prediction.modelVersion}
              </span>
            </div>
            <h3 className="font-serif font-bold text-xl text-[#231F2B] dark:text-[#F3EEE4]">
              {config.title}
            </h3>
            <p className="text-sm text-[#5C5665] dark:text-[#8C8496] leading-relaxed">
              {config.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-[#5C5665] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Protocol Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: 15-15 Rule */}
        <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#221E2B]/80 border border-[#231F2B]/10 dark:border-white/10 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#E0527F]/10 text-[#E0527F] font-bold text-xs flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <p className="font-bold text-xs text-[#231F2B] dark:text-[#F3EEE4]">Rule of 15</p>
            <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">Take 15g fast-acting carbs immediately</p>
          </div>
        </div>

        {/* Step 2: 15 Minute Wait */}
        <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#221E2B]/80 border border-[#231F2B]/10 dark:border-white/10 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#2A3F8F]/10 text-[#2A3F8F] font-bold text-xs flex items-center justify-center shrink-0">
            2
          </div>
          <div>
            <p className="font-bold text-xs text-[#231F2B] dark:text-[#F3EEE4]">Wait 15 Minutes</p>
            <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">Rest and avoid insulin injection</p>
          </div>
        </div>

        {/* Step 3: Re-Check */}
        <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#221E2B]/80 border border-[#231F2B]/10 dark:border-white/10 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#2E8B57]/10 text-[#2E8B57] font-bold text-xs flex items-center justify-center shrink-0">
            3
          </div>
          <div>
            <p className="font-bold text-xs text-[#231F2B] dark:text-[#F3EEE4]">Recheck Sensor</p>
            <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">If still &lt;70 mg/dL, repeat 15g carbs</p>
          </div>
        </div>
      </div>

      {/* Desi Fast Carbs options */}
      <div className="mt-4 pt-4 border-t border-[#231F2B]/[0.08] dark:border-white/[0.08]">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#231F2B] dark:text-[#F3EEE4] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E0527F]" />
            Recommended Indian Fast Carbs (15g Portions)
          </p>
          <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">Quick absorption</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {desiFastCarbs.map((item) => (
            <div
              key={item.name}
              className="p-2.5 rounded-xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 flex flex-col justify-between"
            >
              <p className="font-semibold text-xs text-[#231F2B] dark:text-[#F3EEE4] leading-snug">
                {item.name}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-[#5C5665] dark:text-[#8C8496]">
                <span>{item.qty}</span>
                <span className="font-bold text-[#E0527F]">{item.carbs}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}