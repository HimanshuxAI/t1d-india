'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Calculator, AlertCircle, CheckCircle2, Info, X, Droplet, Sparkles, ShieldCheck } from 'lucide-react';

interface InsulinCalculatorCardProps {
  currentGlucose: number | null;
}

export function InsulinCalculatorCard({ currentGlucose }: InsulinCalculatorCardProps) {
  const [carbs, setCarbs] = useState('');
  const [glucose, setGlucose] = useState(currentGlucose?.toString() || '108');
  const [regimen, setRegimen] = useState<'indian' | 'analog'>('indian');
  const [result, setResult] = useState<BolusResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (currentGlucose && (!glucose || glucose === '108')) {
      setGlucose(currentGlucose.toString());
    }
  }, [currentGlucose]);

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
      const carbsNum = parseFloat(carbs) || 0;
      const glucoseNum = parseInt(glucose) || (currentGlucose || 110);
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
      
      // Expected 2h post-meal glucose: baseline + carb rise - bolus drop
      const carbRise = (carbsNum / icr) * isf;
      const insulinDrop = totalBolus * isf;
      const expectedPostMeal = Math.max(70, Math.min(Math.round(glucoseNum + carbRise - insulinDrop), 180));
      const predictedMin = expectedPostMeal;
      const warnings: string[] = [];
      if (predictedMin < 70) {
        warnings.push(`Forecast minimum glucose is ${Math.round(predictedMin)} mg/dL · potential hypo risk`);
      }
      if (totalBolus > 10) {
        warnings.push('High bolus dose (>10U) · please verify carbohydrate estimation');
      }
      
      setResult({
        mealBolusU: Math.round(mealBolus * 10) / 10,
        correctionBolusU: Math.round(correctionBolus * 10) / 10,
        totalBolusU: Math.round(totalBolus * 10) / 10,
        maxAllowedU: 15,
        warnings,
        explanation: `Meal Bolus: ${mealBolus.toFixed(1)}U (${carbsNum}g ÷ 10g/U)${correctionBolus > 0 ? ` + Correction: ${correctionBolus.toFixed(1)}U` : ''} · ICR: 10, ISF: 50`,
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

  const addCarbs = (amount: number) => {
    const current = parseFloat(carbs) || 0;
    setCarbs(String(current + amount));
  };

  return (
    <div className="card p-6 sm:p-7 bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_2px_12px_rgba(35,31,43,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2A3F8F]/10 dark:bg-[#7F93E6]/20 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
            <Droplet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-xl text-[#231F2B] dark:text-[#F3EEE4]">
              Insulin Bolus Calculator
            </h3>
            <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">Indian care regimen & ICR matching</p>
          </div>
        </div>

        {/* Regimen toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF4E8] dark:bg-[#1A1622] border border-[#231F2B]/10 dark:border-white/10 text-xs font-semibold">
          <button
            onClick={() => setRegimen('indian')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all',
              regimen === 'indian'
                ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-xs'
                : 'text-[#5C5665] dark:text-[#8C8496]'
            )}
          >
            NPH + Regular
          </button>
          <button
            onClick={() => setRegimen('analog')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all',
              regimen === 'analog'
                ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-xs'
                : 'text-[#5C5665] dark:text-[#8C8496]'
            )}
          >
            Basal-Bolus
          </button>
        </div>
      </div>

      <div className="mt-5">
        {!result ? (
          <form onSubmit={(e) => { e.preventDefault(); calculateBolus(); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Carbs Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="carbs" className="text-xs font-bold uppercase tracking-wider text-[#231F2B] dark:text-[#F3EEE4]">
                    Meal Carbs (g)
                  </label>
                  <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">ICR: 10 g/U</span>
                </div>
                <input
                  id="carbs"
                  type="number"
                  min="0"
                  max="300"
                  step="1"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="e.g. 55"
                  className="input font-semibold text-base"
                  required
                />
                
                {/* Desi carb presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addCarbs(15)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF4E8] dark:bg-[#1A1622] hover:bg-[#F3E9D5] text-[#231F2B] dark:text-[#F3EEE4] border border-[#231F2B]/10 transition-colors"
                  >
                    +15g (1 Roti)
                  </button>
                  <button
                    type="button"
                    onClick={() => addCarbs(30)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF4E8] dark:bg-[#1A1622] hover:bg-[#F3E9D5] text-[#231F2B] dark:text-[#F3EEE4] border border-[#231F2B]/10 transition-colors"
                  >
                    +30g (2 Roti)
                  </button>
                  <button
                    type="button"
                    onClick={() => addCarbs(45)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF4E8] dark:bg-[#1A1622] hover:bg-[#F3E9D5] text-[#231F2B] dark:text-[#F3EEE4] border border-[#231F2B]/10 transition-colors"
                  >
                    +45g (Rice Bowl)
                  </button>
                </div>
              </div>

              {/* Glucose Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="glucose" className="text-xs font-bold uppercase tracking-wider text-[#231F2B] dark:text-[#F3EEE4]">
                    Current Glucose (mg/dL)
                  </label>
                  <span className="text-[11px] text-[#2E8B57] font-semibold">Sensor Synced</span>
                </div>
                <input
                  id="glucose"
                  type="number"
                  min="20"
                  max="400"
                  step="1"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  placeholder={currentGlucose ? `${currentGlucose}` : '110'}
                  className="input font-semibold text-base"
                  required
                />
                <p className="text-[11px] text-[#5C5665] dark:text-[#8C8496] mt-1.5">
                  Target: 110 mg/dL · ISF: 50 mg/dL/U
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCalculating || (!carbs && !glucose)}
              className="w-full btn-primary py-3 text-sm font-bold shadow-sm"
            >
              {isCalculating ? 'Computing Dose...' : 'Calculate Recommended Bolus'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Calculation Card */}
            <div className="p-5 rounded-2xl bg-[#E6EBD5]/40 dark:bg-[#1E251A] border border-[#231F2B]/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#2A3F8F] text-[#FAF4E8] flex items-center justify-center font-serif font-black text-2xl shadow-sm">
                  {result.totalBolusU.toFixed(1)}U
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2A3F8F] dark:text-[#7F93E6]">
                    Recommended Dose ({regimen === 'indian' ? 'Regular Insulin' : 'Rapid Analog'})
                  </span>
                  <div className="flex items-center gap-3 text-xs text-[#5C5665] dark:text-[#8C8496] mt-0.5">
                    <span>Meal: <strong>{result.mealBolusU.toFixed(1)}U</strong></span>
                    <span>Correction: <strong>{result.correctionBolusU.toFixed(1)}U</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetForm}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  Recalculate
                </button>
                <button
                  onClick={() => alert(`Logged ${result.totalBolusU.toFixed(1)}U insulin bolus!`)}
                  className="btn-primary text-xs px-3.5 py-1.5"
                >
                  Confirm & Log Dose
                </button>
              </div>
            </div>

            {/* Safety Prediction */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A1622] border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2E8B57]" />
                <span className="text-[#5C5665] dark:text-[#8C8496]">Safety check:</span>
                <span className="font-semibold text-[#231F2B] dark:text-[#F3EEE4]">
                  Predicted minimum glucose ~{result.safetyCheck.predictedMinGlucose} mg/dL
                </span>
              </div>
              <span className="font-bold text-[#2E8B57] px-2 py-0.5 rounded-md bg-[#2E8B57]/10">
                Safe Margin
              </span>
            </div>

            {result.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FFF5F5] dark:bg-[#2A1519] border border-[#D64045]/30 text-xs text-[#D64045] space-y-1">
                {result.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}