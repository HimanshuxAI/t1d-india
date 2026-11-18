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
      // In real app, call API
      // const response = await fetch('/api/v1/insulin/calculate-bolus', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     carbsG: parseFloat(carbs) || 0,
      //     currentGlucoseMgDl: parseInt(glucose) || 0,
      //   }),
      // });
      // const data = await response.json();
      // setResult(data);
      
      // Mock calculation for demo
      const carbsNum = parseFloat(carbs) || 0;
      const glucoseNum = parseInt(glucose) || 110;
      const icr = 10;
      const isf = 50;
      const target = 110;
      
      let mealBolus = carbsNum / icr;
      let correctionBolus = 0;
      if (glucoseNum > target) {
        correctionBolus = Math.min((glucoseNum - target) / isf, 5);
      }
      let totalBolus = mealBolus + correctionBolus;
      totalBolus = Math.min(totalBolus, 15);
      
      const predictedMin = glucoseNum - totalBolus * isf;
      const warnings: string[] = [];
      if (predictedMin < 70) {
        warnings.push(`Predicted glucose may drop to ${Math.round(predictedMin)} mg/dL`);
      }
      if (totalBolus > 10) {
        warnings.push('High bolus dose - double check carbs and glucose');
      }
      
      setResult({
        mealBolusU: Math.round(mealBolus * 10) / 10,
        correctionBolusU: Math.round(correctionBolus * 10) / 10,
        totalBolusU: Math.round(totalBolus * 10) / 10,
        maxAllowedU: 15,
        warnings,
        explanation: `Meal: ${mealBolus.toFixed(1)}U (${carbsNum}g/${icr}g/U)${correctionBolus > 0 ? ` + Correction: ${correctionBolus.toFixed(1)}U` : ''}`,
        safetyCheck: {
          predictedMinGlucose: Math.round(predictedMin),
          iobTotalU: 0,
        },
      });
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
          <Calculator className="w-5 h-5 text-primary-600" />
          <h3 className="card-title">Insulin Calculator</h3>
        </div>
        {result && (
          <button
            onClick={resetForm}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                  Carbs (g) <span className="text-primary-600">*</span>
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
                <p className="text-xs text-muted-foreground mt-1">Enter carbs from meal log or estimate</p>
              </div>
              <div>
                <label htmlFor="glucose" className="block text-sm font-medium mb-1">
                  Current Glucose (mg/dL) <span className="text-primary-600">*</span>
                </label>
                <input
                  id="glucose"
                  type="number"
                  min="20"
                  max="400"
                  step="1"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  placeholder={currentGlucose ? `${currentGlucose}` : 'e.g., 140'}
                  className="input"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">From CGM or fingerstick</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
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
                ? 'bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800'
                : result.warnings.length > 0
                ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800'
                : 'bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800'
            )}>
              <div className="text-4xl font-bold mb-1">
                {result.totalBolusU.toFixed(1)} U
              </div>
              <p className="text-sm text-muted-foreground">Recommended Bolus</p>
              <div className="mt-2 flex justify-center gap-4 text-sm text-muted-foreground">
                <span>Meal: {result.mealBolusU.toFixed(1)}U</span>
                <span>Correction: {result.correctionBolusU.toFixed(1)}U</span>
              </div>
            </div>

            {/* Safety check */}
            <div className={cn(
              'rounded-lg p-3',
              result.safetyCheck.predictedMinGlucose < 70
                ? 'bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800'
                : result.safetyCheck.predictedMinGlucose < 90
                ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800'
                : 'bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.safetyCheck.predictedMinGlucose < 70 ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : result.safetyCheck.predictedMinGlucose < 90 ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  <span className="font-medium">
                    Predicted minimum: {result.safetyCheck.predictedMinGlucose} mg/dL
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  IOB: {result.safetyCheck.iobTotalU}U
                </span>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800 dark:text-red-200">⚠️ Safety Warnings</p>
                    <ul className="mt-1 space-y-1 text-sm text-red-700 dark:text-red-300">
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
            <div className="rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 p-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800 dark:text-blue-200">How we calculated this</p>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">{result.explanation}</p>
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
              className="w-full text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center justify-center gap-1"
            >
              {showDetails ? 'Hide' : 'Show'} Details
              <span className={cn('transition-transform', showDetails && 'rotate-180')}>
                ▼
              </span>
            </button>

            {showDetails && (
              <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm space-y-2">
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
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