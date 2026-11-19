'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Calculator, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface InsulinCalculatorCardProps {
  currentGlucose: number | null;
}

export function InsulinCalculatorCard({ currentGlucose }: InsulinCalculatorCardProps) {
  const [carbs, setCarbs] = useState('');
  const [glucose, setGlucose] = useState(currentGlucose?.toString() || '');
  const [result, setResult] = useState<BolusResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  interface BolusResult {
    mealBolusU: number;
    correctionBolusU: number;
    totalBolusU: number;
    maxAllowedU: number;
    warnings: string[];
    explanation: string;
    safetyCheck: {
      predictedMinGlucose: number;
      iobTotalU: number;
    };
  }

  const calculateBolus = async () => {
    if (!carbs && !glucose) return;
    
    setIsCalculating(true);
    try {
      const res = await fetch('/api/v1/insulin/calculate-bolus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carbsG: parseFloat(carbs) || 0,
          currentGlucoseMgDl: parseInt(glucose) || 0,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Bolus calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const resetForm = () => {
    setCarbs('');
    setGlucose(currentGlucose?.toString() || '');
    setResult(null);
  };

  return (
    <div className="card">
      <div className="card-header flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <h3 className="card-title">Insulin Calculator</h3>
        </div>
        {result && (
          <button
            onClick={resetForm}
            className="p-1 rounded hover:bg-surface-soft transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="card-content">
        {!result ? (
          <form onSubmit={(e) => { e.preventDefault(); calculateBolus(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="carbs" className="block text-sm font-medium mb-1">
                  Carbs (g) <span className="text-primary">*</span>
                </label>
                <input
                  id="carbs"
                  type="number"
                  min="0"
                  max="300"
                  step="1"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="e.g., 60"
                  className="input"
                  required
                />
                <p className="text-xs text-text-muted mt-1">Enter carbs from meal log or estimate</p>
              </div>
              <div>
                <label htmlFor="glucose" className="block text-sm font-medium mb-1">
                  Current Glucose (mg/dL) <span className="text-primary">*</span>
                </label>
                <input
                  id="glucose"
                  type="number"
                  min="20"
                  max="400"
                  step="1"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value))
                  placeholder={currentGlucose ? `${currentGlucose}` : 'e.g., 140'}
                  className="input"
                  required
                />
                <p className="text-xs text-text-muted mt-1">From CGM or fingerstick</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-text-muted">
              <div className="flex items-center gap-1">
                <Info className="w-4 h-4" />
                <span>ICR: 10 g/U (from profile)</span>
              </div>
              <div className="flex items-center gap-1">
                <Info className="w-4 h-4" />
                <span>ISF: 50 mg/dL/U (from profile)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCalculating || (!carbs && !glucose)}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {isCalculating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Calculating...
                </span>
              ) : (
                'Calculate Bolus'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Result summary */}
            <div className={cn(
              'rounded-xl p-4 text-center',
              result.warnings.some(w => w.includes('drop') || w.includes('High bolus'))
                ? 'bg-glucose-very-low/10 border border-glucose-very-low/30 dark:bg-glucose-very-low/20 dark:border-glucose-very-low/30'
                : result.warnings.length > 0
                ? 'bg-glucose-high/10 border border-glucose-high/30 dark:bg-glucose-high/20 dark:border-glucose-high/30'
                : 'bg-glucose-in-range/10 border border-glucose-in-range/30 dark:bg-glucose-in-range/20 dark:border-glucose-in-range/30'
            )}>
              <div className="text-4xl font-bold mb-1">
                {result.totalBolusU.toFixed(1)} U
              </div>
              <p className="text-sm text-text-muted">Recommended Bolus</p>
              <div className="mt-2 flex justify-center gap-4 text-sm text-text-muted">
                <span>Meal: {result.mealBolusU.toFixed(1)}U</span>
                <span>Correction: {result.correctionBolusU.toFixed(1)}U</span>
              </div>
            </div>

            {/* Safety check */}
            <div className={cn(
              'rounded-lg p-3',
              result.safetyCheck.predictedMinGlucose < 70
                ? 'bg-glucose-very-low/10 border border-glucose-very-low/30 dark:bg-glucose-very-low/20 dark:border-glucose-very-low/30'
                : result.safetyCheck.predictedMinGlucose < 90
                ? 'bg-glucose-high/10 border border-glucose-high/30 dark:bg-glucose-high/20 dark:border-glucose-high/30'
                : 'bg-glucose-in-range/10 border border-glucose-in-range/30 dark:bg-glucose-in-range/20 dark:border-glucose-in-range/30'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.safetyCheck.predictedMinGlucose < 70 ? (
                    <AlertTriangle className="w-5 h-5 text-glucose-very-low" />
                  ) : result.safetyCheck.predictedMinGlucose < 90 ? (
                    <AlertTriangle className="w-5 h-5 text-glucose-high" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-glucose-in-range" />
                  )}
                  <span className="font-medium">
                    Predicted minimum: {result.safetyCheck.predictedMinGlucose} mg/dL
                  </span>
                </div>
                <span className="text-sm text-text-muted">
                  IOB: {result.safetyCheck.iobTotalU}U
                </span>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="rounded-lg bg-glucose-very-low/10 border border-glucose-very-low/30 dark:bg-glucose-very-low/20 dark:border-glucose-very-low/30 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-glucose-very-low mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-glucose-very-low dark:text-glucose-very-low">⚠️ Safety Warnings</p>
                    <ul className="mt-1 space-y-1 text-sm text-glucose-very-low dark:text-glucose-very-low">
                      {result.warnings.map((warning, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>•</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div className="rounded-lg bg-primary/10 border border-primary/30 dark:bg-primary/20 dark:border-primary/30 p-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-primary">How we calculated this</p>
                  <p className="mt-1 text-sm text-primary/90">{result.explanation}</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 btn-outline"
              >
                New Calculation
              </button>
              <button className="btn-primary">
                Save to Log
              </button>
            </div>

            {/* Advanced details toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1"
            >
              {showDetails ? 'Hide' : 'Show'} Details
              <span className={cn('transition-transform', showDetails && 'rotate-180')}>
                ▼
              </span>
            </button>

            {showDetails && (
              <div className="mt-4 p-3 rounded-lg bg-surface-soft dark:bg-surface-soft/50 text-sm space-y-2">
                <div className="grid grid-cols-2 gap-2 text-text-muted">
                  <span>Target Glucose:</span> <span className="font-medium">110 mg/dL</span>
                  <span>Max Bolus:</span> <span className="font-medium">15 U</span>
                  <span>Max Correction:</span> <span className="font-medium">5 U</span>
                  <span>Min Glucose for Correction:</span> <span className="font-medium">90 mg/dL</span>
                  <span>IOB High Threshold:</span> <span className="font-medium">3 U</span>
                  <span>Recent Hypo Window:</span> <span className="font-medium">2 hours</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface BolusResult {
  mealBolusU: number;
  correctionBolusU: number;
  totalBolusU: number;
  maxAllowedU: number;
  warnings: string[];
  explanation: string;
  safetyCheck: {
    predictedMinGlucose: number;
    iobTotalU: number;
  };
}