'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, X, AlertCircle, Info } from 'lucide-react';

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
  if (predictions.length === 0) return null;

  // Find the most urgent prediction
  const urgentPrediction = predictions.find(p => p.hypoProbability > 0.5 || p.severeHypoProbability > 0.3);
  const warningPrediction = predictions.find(p => p.hypoProbability > 0.2);
  const prediction = urgentPrediction || warningPrediction;

  if (!prediction) return null;

  const isUrgent = prediction.hypoProbability > 0.5 || prediction.severeHypoProbability > 0.3;
  const isSevere = prediction.severeHypoProbability > 0.3;

  const getAlertConfig = () => {
    if (isSevere) {
      return {
        icon: AlertTriangle,
        bg: 'bg-glucose-very-low/10 border-glucose-very-low/30 dark:bg-glucose-very-low/20 dark:border-glucose-very-low/30',
        text: 'text-glucose-very-low',
        iconColor: 'text-glucose-very-low',
        title: '🚨 SEVERE HYPOGLYCEMIA RISK',
        description: `High risk of glucose < 54 mg/dL in ${prediction.horizonMin} minutes`,
      };
    }
    if (isUrgent) {
      return {
        icon: AlertCircle,
        bg: 'bg-glucose-high/10 border-glucose-high/30 dark:bg-glucose-high/20 dark:border-glucose-high/30',
        text: 'text-glucose-high',
        iconColor: 'text-glucose-high',
        title: '⚠️ HYPOGLYCEMIA WARNING',
        description: `Glucose may drop below 70 mg/dL in ${prediction.horizonMin} minutes`,
      };
    }
    return {
      icon: Info,
      bg: 'bg-glucose-high/10 border-glucose-high/30 dark:bg-glucose-high/20 dark:border-glucose-high/30',
      text: 'text-glucose-high',
      iconColor: 'text-glucose-high',
      title: '⚠️ HYPOGLYCEMIA WATCH',
      description: `Moderate risk of glucose < 70 mg/dL in ${prediction.horizonMin} minutes`,
    };
  }

  const config = getAlertConfig();
  const Icon = config.icon;

  const indianCarbOptions = [
    { item: 'Glucose tablets (Dextro/Glucovita)', quantity: '3-4 tablets', carbsG: 12 },
    { item: 'Fruit juice (orange/mango/apple)', quantity: '150-200 ml', carbsG: 15 },
    { item: 'Sugar (white/brown)', quantity: '1 tablespoon (12g)', carbsG: 12 },
    { item: 'Honey', quantity: '1 tablespoon (21g)', carbsG: 17 },
    { item: 'Regular soda (not diet)', quantity: '150 ml', carbsG: 15 },
    { item: 'Banana (small)', quantity: '1 (80g)', carbsG: 18 },
    { item: 'Dates (khajoor)', quantity: '2-3 pieces', carbsG: 15 },
    { item: 'Raisins (kishmish)', quantity: '1 tablespoon (15g)', carbsG: 12 },
  ];

  return (
    <div className={cn('relative border rounded-xl p-4', config.bg, config.text)}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={cn('w-6 h-6', config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <p className="mt-1 text-sm">{config.description}</p>
          
          <div className="mt-3 p-3 bg-card/50 dark:bg-black/20 rounded-lg">
            <p className="font-medium mb-2">🚨 IMMEDIATE ACTION REQUIRED:</p>
            <div className="space-y-1 text-sm">
              <p>• <strong>Eat 15-20g fast carbs NOW</strong></p>
              <p>• Recheck glucose in 15 minutes</p>
              <p>• If still <70 mg/dL, repeat</p>
            </div>
          </div>

          <div className="mt-3">
            <p className="font-medium text-sm mb-2">🇮🇳 Indian Fast Carb Options (15g each):</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {indianCarbOptions.map((opt) => (
                <div key={opt.item} className="bg-card/50 dark:bg-black/20 rounded-lg p-2 text-center text-xs">
                  <p className="font-medium">{opt.item}</p>
                  <p className="text-text-muted">{opt.quantity}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
            <span>Predicted: {prediction.glucoseP10}–{prediction.glucoseP90} mg/dL (median: {prediction.glucoseP50})</span>
            <span className="mx-1">•</span>
            <span>Hypo risk: {Math.round(prediction.hypoProbability * 100)}%</span>
            <span className="mx-1">•</span>
            <span>Model: {prediction.modelVersion}</span>
          </div>
        </div>
        <button
          className="flex-shrink-0 p-1 rounded hover:bg-card/50 dark:hover:bg-black/10 transition-colors"
          onClick={() => { /* Dismiss logic */ }}
          aria-label="Dismiss alert"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

const indianCarbOptions = [
  { item: 'Glucose tablets (Dextro/Glucovita)', quantity: '3-4 tablets', carbsG: 12 },
  { item: 'Fruit juice (orange/mango/apple)', quantity: '150-200 ml', carbsG: 15 },
  { item: 'Sugar (white/brown)', quantity: '1 tablespoon (12g)', carbsG: 12 },
  { item: 'Honey', quantity: '1 tablespoon (21g)', carbsG: 17 },
  { item: 'Regular soda (not diet)', quantity: '150 ml', carbsG: 15 },
  { item: 'Banana (small)', quantity: '1 (80g)', carbsG: 18 },
  { item: 'Dates (khajoor)', quantity: '2-3 pieces', carbsG: 15 },
  { item: 'Raisins (kishmish)', quantity: '1 tablespoon (15g)', carbsG: 12 },
];