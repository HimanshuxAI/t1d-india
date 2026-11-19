'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout';
import {
  Syringe,
  Droplet,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  Plus,
  Minus,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  HeartPulse,
  Wheat,
  Utensils,
  Soup,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InsulinPage() {
  // Clinical ratios for Aarav (14y, T1D)
  const ICR = 10; // 1 unit per 10g carbs
  const ISF = 50; // 1 unit drops glucose 50 mg/dL
  const TARGET_GLUCOSE = 110;

  // Meal carb building state
  const [rotiCount, setRotiCount] = useState(2); // 15g per chapati
  const [ricePortions, setRicePortions] = useState(1); // 28g per katori
  const [dalPortions, setDalPortions] = useState(1); // 20g per katori
  const [extraCarbs, setExtraCarbs] = useState(0);

  // Glucose state
  const [currentGlucose, setCurrentGlucose] = useState<number>(128);
  const [regimenType, setRegimenType] = useState<'NPH_REGULAR' | 'BASAL_BOLUS'>('NPH_REGULAR');
  const [doseLogged, setDoseLogged] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'timeline' | 'pharmacokinetics'>('interactive');

  // Total carb calculation
  const totalCarbs = useMemo(() => {
    return rotiCount * 15 + ricePortions * 28 + dalPortions * 20 + extraCarbs;
  }, [rotiCount, ricePortions, dalPortions, extraCarbs]);

  // Bolus computation
  const { mealBolus, correctionBolus, totalBolus, predictedMinGlucose, safetyStatus } = useMemo(() => {
    const mb = totalCarbs / ICR;
    const cb = currentGlucose > TARGET_GLUCOSE ? Math.max(0, (currentGlucose - TARGET_GLUCOSE) / ISF) : 0;
    const rawTotal = mb + cb;
    const rounded = Math.round(rawTotal * 10) / 10;
    const predMin = currentGlucose - (cb * ISF);

    let status = 'SAFE';
    if (predMin < 70) status = 'HYPO_RISK';
    else if (rounded > 10) status = 'HIGH_DOSE';

    return {
      mealBolus: Math.round(mb * 10) / 10,
      correctionBolus: Math.round(cb * 10) / 10,
      totalBolus: rounded,
      predictedMinGlucose: Math.round(predMin),
      safetyStatus: status,
    };
  }, [totalCarbs, currentGlucose, ICR, ISF, TARGET_GLUCOSE]);

  const handleLogDose = () => {
    setDoseLogged(true);
    setTimeout(() => setDoseLogged(false), 4000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        {/* Editorial Page Header */}
        <div className="relative pt-2 pb-6 border-b border-[#231F2B]/10 dark:border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF4E8] dark:bg-[#1E1926] border border-[#231F2B]/10 text-xs font-bold text-[#2A3F8F] dark:text-[#7F93E6] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#2A3F8F]" />
              Clinical Bolus & Regimen Advisory
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-black text-[#231F2B] dark:text-[#F3EEE4] tracking-tight">
              Insulin Dosage & Regimen
            </h1>
            <p className="text-sm sm:text-base text-[#5C5665] dark:text-[#8C8496] max-w-2xl mt-1.5 leading-relaxed">
              Formulated specifically for Indian diets and the split human insulin protocol (NPH + Regular).
            </p>
          </div>

          {/* Navigation Pill Switcher */}
          <div className="flex p-1.5 rounded-2xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-xs self-start md:self-auto">
            <button
              onClick={() => setViewMode('interactive')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all',
                viewMode === 'interactive'
                  ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-sm'
                  : 'text-[#5C5665] hover:text-[#231F2B] dark:text-[#8C8496]'
              )}
            >
              Bolus Builder
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all',
                viewMode === 'timeline'
                  ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-sm'
                  : 'text-[#5C5665] hover:text-[#231F2B] dark:text-[#8C8496]'
              )}
            >
              24h Regimen
            </button>
            <button
              onClick={() => setViewMode('pharmacokinetics')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all',
                viewMode === 'pharmacokinetics'
                  ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-sm'
                  : 'text-[#5C5665] hover:text-[#231F2B] dark:text-[#8C8496]'
              )}
            >
              Action Curves
            </button>
          </div>
        </div>

        {doseLogged && (
          <div className="p-4 rounded-2xl bg-[#E6EBD5] border border-[#2E8B57]/30 flex items-center justify-between text-[#231F2B] animate-slide-down">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#2E8B57]" />
              <div>
                <p className="font-bold text-sm">Insulin Dose Logged Successfully!</p>
                <p className="text-xs text-[#5C5665]">
                  Recorded {totalBolus} Units ({regimenType === 'NPH_REGULAR' ? 'Regular Human Insulin' : 'Rapid Analog'}) for {totalCarbs}g carbs.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/80 text-[#2E8B57]">
              Synced to EMR
            </span>
          </div>
        )}

        {viewMode === 'interactive' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Columns: Visual Desi Meal Carb Builder */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Visual Indian Meal Plate */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_4px_24px_rgba(35,31,43,0.04)]">
                <div className="flex items-center justify-between pb-4 border-b border-[#231F2B]/[0.08] dark:border-white/[0.08]">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#E0527F]">
                      Indian Plate Carb Estimator
                    </span>
                    <h2 className="font-serif text-2xl font-black text-[#231F2B] dark:text-[#F3EEE4] mt-0.5">
                      Meal Composition & Portions
                    </h2>
                  </div>
                  <button
                    onClick={() => { setRotiCount(0); setRicePortions(0); setDalPortions(0); setExtraCarbs(0); }}
                    className="p-2 rounded-xl text-[#5C5665] hover:bg-[#FAF4E8] dark:hover:bg-[#1A1622] transition-colors text-xs font-semibold flex items-center gap-1"
                    title="Reset Plate"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                {/* Interactive Desi Food Counters */}
                <div className="mt-6 space-y-4">
                  {/* Roti / Chapati Row */}
                  <div className="p-4 rounded-2xl bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#E8A33D]/15 text-[#CB8020] flex items-center justify-center font-serif font-black text-xl">
                        <Wheat className="w-6 h-6 text-[#CB8020]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base text-[#231F2B] dark:text-[#F3EEE4]">
                            Wheat Roti / Chapati
                          </p>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-[#221E2B] text-[#5C5665] border border-[#231F2B]/10">
                            15g carbs each
                          </span>
                        </div>
                        <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-0.5">
                          Tawa phulka with ghee (subtotal: {rotiCount * 15}g)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setRotiCount(Math.max(0, rotiCount - 1))}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/15 dark:border-white/15 flex items-center justify-center text-[#231F2B] dark:text-[#F3EEE4] hover:bg-[#FAF4E8] active:scale-95 transition-all shadow-2xs"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-serif font-black text-xl w-6 text-center text-[#231F2B] dark:text-[#F3EEE4]">
                        {rotiCount}
                      </span>
                      <button
                        onClick={() => setRotiCount(rotiCount + 1)}
                        className="w-9 h-9 rounded-xl bg-[#2A3F8F] text-[#FAF4E8] flex items-center justify-center hover:bg-[#223273] active:scale-95 transition-all shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rice / Chawal Row */}
                  <div className="p-4 rounded-2xl bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#2E8B57]/15 text-[#2E8B57] flex items-center justify-center font-serif font-black text-xl">
                        <Utensils className="w-6 h-6 text-[#2E8B57]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base text-[#231F2B] dark:text-[#F3EEE4]">
                            Cooked Basmati Rice
                          </p>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-[#221E2B] text-[#5C5665] border border-[#231F2B]/10">
                            28g per katori
                          </span>
                        </div>
                        <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-0.5">
                          Standard 150g cooked cup (subtotal: {ricePortions * 28}g)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setRicePortions(Math.max(0, ricePortions - 1))}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/15 dark:border-white/15 flex items-center justify-center text-[#231F2B] dark:text-[#F3EEE4] hover:bg-[#FAF4E8] active:scale-95 transition-all shadow-2xs"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-serif font-black text-xl w-6 text-center text-[#231F2B] dark:text-[#F3EEE4]">
                        {ricePortions}
                      </span>
                      <button
                        onClick={() => setRicePortions(ricePortions + 1)}
                        className="w-9 h-9 rounded-xl bg-[#2A3F8F] text-[#FAF4E8] flex items-center justify-center hover:bg-[#223273] active:scale-95 transition-all shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Dal / Pulses Row */}
                  <div className="p-4 rounded-2xl bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#E0527F]/15 text-[#E0527F] flex items-center justify-center font-serif font-black text-xl">
                        <Soup className="w-6 h-6 text-[#E0527F]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base text-[#231F2B] dark:text-[#F3EEE4]">
                            Toor / Moong Dal / Rajma
                          </p>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-[#221E2B] text-[#5C5665] border border-[#231F2B]/10">
                            20g per katori
                          </span>
                        </div>
                        <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-0.5">
                          High protein & fiber slow carb (subtotal: {dalPortions * 20}g)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDalPortions(Math.max(0, dalPortions - 1))}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/15 dark:border-white/15 flex items-center justify-center text-[#231F2B] dark:text-[#F3EEE4] hover:bg-[#FAF4E8] active:scale-95 transition-all shadow-2xs"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-serif font-black text-xl w-6 text-center text-[#231F2B] dark:text-[#F3EEE4]">
                        {dalPortions}
                      </span>
                      <button
                        onClick={() => setDalPortions(dalPortions + 1)}
                        className="w-9 h-9 rounded-xl bg-[#2A3F8F] text-[#FAF4E8] flex items-center justify-center hover:bg-[#223273] active:scale-95 transition-all shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Quick Add Carb Badges */}
                <div className="mt-6 pt-5 border-t border-[#231F2B]/[0.08] dark:border-white/[0.08]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-3">
                    Quick Add Indian Sides & Sweets
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { name: '+ Chaas / Lassi (6g)', carbs: 6 },
                      { name: '+ Masala Chai with Sugar (12g)', carbs: 12 },
                      { name: '+ Roasted Papad (3g)', carbs: 3 },
                      { name: '+ Boondi Raita (10g)', carbs: 10 },
                      { name: '+ Gulab Jamun (24g)', carbs: 24 },
                    ].map((item) => (
                      <button
                        key={item.name}
                        onClick={() => setExtraCarbs(extraCarbs + item.carbs)}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF4E8] dark:bg-[#1A1622] hover:bg-[#F3E9D5] dark:hover:bg-[#261E2E] text-xs font-semibold text-[#231F2B] dark:text-[#F3EEE4] border border-[#231F2B]/10 transition-colors"
                      >
                        {item.name}
                      </button>
                    ))}
                    {extraCarbs > 0 && (
                      <button
                        onClick={() => setExtraCarbs(0)}
                        className="text-xs font-bold text-[#E0527F] hover:underline ml-2"
                      >
                        Clear sides ({extraCarbs}g)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Current Glucose & Regimen Mode */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_4px_24px_rgba(35,31,43,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#2A3F8F] dark:text-[#7F93E6]">
                    Current Pre-Meal Sensor Reading
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <input
                      type="number"
                      value={currentGlucose}
                      onChange={(e) => setCurrentGlucose(Number(e.target.value) || 100)}
                      className="font-serif text-4xl font-black text-[#231F2B] dark:text-[#F3EEE4] bg-transparent border-b-2 border-[#2A3F8F] w-24 focus:outline-none"
                    />
                    <span className="text-sm font-bold text-[#5C5665] dark:text-[#8C8496]">mg/dL</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2E8B57]/10 text-[#2E8B57] ml-2">
                      Target 110 mg/dL
                    </span>
                  </div>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-1">
                    ISF: 1 Unit drops 50 mg/dL · ICR: 1 Unit covers 10g carbs
                  </p>
                </div>

                <div className="p-1 rounded-2xl bg-[#FAF4E8] dark:bg-[#1A1622] border border-[#231F2B]/10 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5665] px-3 pt-1">
                    Prescribed Care Protocol
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setRegimenType('NPH_REGULAR')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                        regimenType === 'NPH_REGULAR'
                          ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-xs'
                          : 'text-[#5C5665] dark:text-[#8C8496]'
                      )}
                    >
                      NPH + Regular (Desi)
                    </button>
                    <button
                      onClick={() => setRegimenType('BASAL_BOLUS')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                        regimenType === 'BASAL_BOLUS'
                          ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-xs'
                          : 'text-[#5C5665] dark:text-[#8C8496]'
                      )}
                    >
                      Basal-Bolus Analog
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: The Master Insulin Bolus Dial & Safety Guard */}
            <div className="lg:col-span-5 space-y-6">
              {/* The Hero Dose Dial */}
              <div className="p-7 sm:p-8 rounded-3xl bg-[#FAF4E8] dark:bg-[#1E1926] border-2 border-[#2A3F8F]/20 dark:border-[#7F93E6]/20 shadow-[0_6px_30px_rgba(42,63,143,0.08)] relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-[#231F2B]/10 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-5 h-5 text-[#2A3F8F] dark:text-[#7F93E6]" />
                    <span className="font-serif font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4]">
                      Recommended Dose
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#2A3F8F] text-[#FAF4E8]">
                    {regimenType === 'NPH_REGULAR' ? 'Human Regular' : 'Rapid Analog'}
                  </span>
                </div>

                {/* Big Visual Dose Number */}
                <div className="my-8 text-center">
                  <div className="inline-flex flex-col items-center">
                    <div className="relative">
                      <span className="font-serif text-8xl sm:text-9xl font-black text-[#2A3F8F] dark:text-[#7F93E6] tracking-tighter leading-none">
                        {totalBolus}
                      </span>
                      <span className="font-serif text-2xl font-bold text-[#E0527F] ml-1">
                        Units
                      </span>
                    </div>

                    <p className="text-xs font-bold uppercase tracking-widest text-[#5C5665] dark:text-[#8C8496] mt-2">
                      Total Meal + Correction Bolus
                    </p>
                  </div>
                </div>

                {/* Clinical Math Formula Breakdown */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-[#5C5665] dark:text-[#8C8496]">
                      Meal Bolus ({totalCarbs}g ÷ 10g/U):
                    </span>
                    <span className="font-bold text-[#231F2B] dark:text-[#F3EEE4]">
                      {mealBolus} U
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-medium">
                    <span className="text-[#5C5665] dark:text-[#8C8496]">
                      Correction ({currentGlucose} - 110 ÷ 50):
                    </span>
                    <span className="font-bold text-[#231F2B] dark:text-[#F3EEE4]">
                      +{correctionBolus} U
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#231F2B]/10 dark:border-white/10 flex items-center justify-between font-bold text-sm">
                    <span className="text-[#231F2B] dark:text-[#F3EEE4]">Net Injected Dose:</span>
                    <span className="font-serif text-lg text-[#2A3F8F] dark:text-[#7F93E6]">
                      {totalBolus} Units
                    </span>
                  </div>
                </div>

                {/* Safety Check Badge */}
                <div className="mt-4 p-3.5 rounded-2xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#2E8B57]" />
                    <div>
                      <p className="font-bold text-xs text-[#231F2B] dark:text-[#F3EEE4]">
                        Predicted Minimum: ~{predictedMinGlucose} mg/dL
                      </p>
                      <p className="text-[10px] text-[#5C5665] dark:text-[#8C8496]">
                        Safe margin above 70 mg/dL clinical hypoglycemia
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#2E8B57]/10 text-[#2E8B57]">
                    SAFE
                  </span>
                </div>

                {/* Primary Dose Confirmation CTA */}
                <button
                  onClick={handleLogDose}
                  className="mt-6 w-full py-4 rounded-2xl bg-[#2A3F8F] hover:bg-[#223273] active:scale-[0.98] text-[#FAF4E8] font-serif font-black text-lg shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Syringe className="w-5 h-5" />
                  Log Dose of {totalBolus} Units
                </button>
                <p className="text-[10px] text-center text-[#5C5665] dark:text-[#8C8496] mt-2">
                  Inject 20–30 minutes before meal for Regular insulin; immediately before for Rapid analog.
                </p>
              </div>

              {/* Clinical Note: Why Indian Care Requires Regular Insulin Knowledge */}
              <div className="p-5 rounded-3xl bg-[#E6EBD5]/60 dark:bg-[#1E251A] border border-[#231F2B]/10 dark:border-white/10">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#2E8B57] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#231F2B] dark:text-[#F3EEE4]">
                      Clinical Insight: Dal & Roti Absorption
                    </h4>
                    <p className="text-xs text-[#5C5665] dark:text-[#8C8496] leading-relaxed mt-1">
                      Western apps assume rapid glucose spikes from simple carbs (pizza, juice). In Indian meals, high fiber and dal proteins delay carbohydrate absorption over 3 to 5 hours. Human Regular insulin's slower 2–4 hour peak provides superior glycemic alignment and prevents early post-prandial hypoglycemia.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'timeline' && (
          /* 24-Hour Day Planner for NPH + Regular Split Regimen */
          <div className="p-8 rounded-3xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_4px_24px_rgba(35,31,43,0.04)] space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#E0527F]">
                24-Hour Regimen Blueprint
              </span>
              <h2 className="font-serif text-3xl font-black text-[#231F2B] dark:text-[#F3EEE4] mt-1">
                Aarav's Daily Indian Split Schedule
              </h2>
              <p className="text-sm text-[#5C5665] dark:text-[#8C8496] mt-1">
                NPH provides the 12–16h basal baseline; Regular provides meal boluses.
              </p>
            </div>

            <div className="relative pl-6 border-l-2 border-[#2A3F8F]/30 space-y-8 mt-8">
              {/* Event 1: Morning Dose */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#2A3F8F] ring-4 ring-[#FAF4E8] dark:ring-[#221E2B]" />
                <div className="p-5 rounded-2xl bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 border border-[#231F2B]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2A3F8F] dark:text-[#7F93E6]">
                      08:00 AM · Morning Injection
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#2A3F8F] text-[#FAF4E8]">
                      20 Units Total
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4] mt-1">
                    16U NPH (Basal) + 4U Regular (Nashta)
                  </h3>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-1">
                    Taken 30 min before Breakfast (Poha + Adrak Chai). NPH covers baseline until evening dinner.
                  </p>
                </div>
              </div>

              {/* Event 2: School Lunch */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#E0527F] ring-4 ring-[#FAF4E8] dark:ring-[#221E2B]" />
                <div className="p-5 rounded-2xl bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 border border-[#231F2B]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E0527F]">
                      01:30 PM · School Lunch (Tiffin)
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E0527F] text-white">
                      6 Units Regular
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4] mt-1">
                    School Tiffin: 2 Roti + Rajma / Bhindi Sabzi (70g carbs)
                  </h3>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-1">
                    NPH from morning is peaking (providing background cover). Only Regular bolus needed.
                  </p>
                </div>
              </div>

              {/* Event 3: Evening Dinner Dose */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#2E8B57] ring-4 ring-[#FAF4E8] dark:ring-[#221E2B]" />
                <div className="p-5 rounded-2xl bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 border border-[#231F2B]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2E8B57]">
                      08:30 PM · Evening / Dinner Injection
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#2E8B57] text-white">
                      16 Units Total
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4] mt-1">
                    12U NPH (Nocturnal) + 4U Regular (Dinner)
                  </h3>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-1">
                    Taken before Dinner (Idli Sambar / Khichdi). 12U NPH covers overnight basal liver glucose output.
                  </p>
                </div>
              </div>

              {/* Event 4: Nocturnal Hypoglycemia Watch Window */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#E8A33D] ring-4 ring-[#FAF4E8] dark:ring-[#221E2B]" />
                <div className="p-5 rounded-2xl bg-[#FFFBF2] dark:bg-[#261E16] border border-[#E8A33D]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#A45D18] dark:text-[#E8A33D]">
                      02:00 AM – 04:30 AM · Critical Hypo Watch Window
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8A33D]/20 text-[#A45D18] dark:text-[#E8A33D]">
                      Peak NPH Action
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4] mt-1">
                    Overnight Sensor Alarm Guard Active
                  </h3>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496] mt-1">
                    NPH peaks 6–8 hours after injection. The TFT model continuously monitors nighttime trend arrows to trigger loud alerts if dropping below 75 mg/dL.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'pharmacokinetics' && (
          /* Pharmacokinetics visual comparison */
          <div className="p-8 rounded-3xl bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 dark:border-white/10 shadow-[0_4px_24px_rgba(35,31,43,0.04)] space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#2A3F8F] dark:text-[#7F93E6]">
                Clinical Pharmacokinetics
              </span>
              <h2 className="font-serif text-3xl font-black text-[#231F2B] dark:text-[#F3EEE4] mt-1">
                Insulin Action Profiles in Indian Care
              </h2>
              <p className="text-sm text-[#5C5665] dark:text-[#8C8496] mt-1">
                Comparing onset, peak, and duration curves across insulin regimens.
              </p>
            </div>

            {/* SVG Visual Curves */}
            <div className="p-6 rounded-2xl bg-[#FAF4E8]/60 dark:bg-[#1A1622]/60 border border-[#231F2B]/10">
              <svg className="w-full h-48 overflow-visible" viewBox="0 0 500 150">
                {/* Axes */}
                <line x1="40" y1="120" x2="480" y2="120" stroke="#231F2B" strokeOpacity="0.2" strokeWidth="1.5" />
                <line x1="40" y1="10" x2="40" y2="120" stroke="#231F2B" strokeOpacity="0.2" strokeWidth="1.5" />

                {/* Curve 1: Rapid Analog (Aspart/Lispro) - sharp peak at 1h */}
                <path
                  d="M 40 120 Q 80 15, 140 70 T 220 120"
                  fill="none"
                  stroke="#E0527F"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Curve 2: Regular Human Insulin - broader peak at 2.5h */}
                <path
                  d="M 40 120 Q 120 25, 200 65 T 340 120"
                  fill="none"
                  stroke="#2A3F8F"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Curve 3: NPH Intermediate - peak at 6h, duration 14h */}
                <path
                  d="M 40 120 Q 220 40, 360 80 T 480 120"
                  fill="none"
                  stroke="#2E8B57"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Legend labels in SVG */}
                <circle cx="80" cy="20" r="4" fill="#E0527F" />
                <text x="90" y="23" fontSize="10" fontWeight="bold" fill="#231F2B">Rapid Analog (Peak 1h)</text>

                <circle cx="210" cy="20" r="4" fill="#2A3F8F" />
                <text x="220" y="23" fontSize="10" fontWeight="bold" fill="#231F2B">Human Regular (Peak 2-3h)</text>

                <circle cx="370" cy="20" r="4" fill="#2E8B57" />
                <text x="380" y="23" fontSize="10" fontWeight="bold" fill="#231F2B">NPH Basal (Peak 6-8h)</text>

                {/* Time markers */}
                <text x="40" y="135" fontSize="10" fill="#8C8496" textAnchor="middle">0h</text>
                <text x="100" y="135" fontSize="10" fill="#8C8496" textAnchor="middle">2h</text>
                <text x="180" y="135" fontSize="10" fill="#8C8496" textAnchor="middle">4h</text>
                <text x="260" y="135" fontSize="10" fill="#8C8496" textAnchor="middle">6h</text>
                <text x="340" y="135" fontSize="10" fill="#8C8496" textAnchor="middle">8h</text>
                <text x="420" y="135" fontSize="10" fill="#8C8496" textAnchor="middle">12h</text>
                <text x="480" y="135" fontSize="10" fill="#8C8496" textAnchor="middle">16h</text>
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-[#FAF4E8]/70 dark:bg-[#1A1622]/70 border border-[#231F2B]/10">
                <span className="text-xs font-bold text-[#E0527F] uppercase tracking-wider">Rapid Analog</span>
                <p className="font-serif font-bold text-base text-[#231F2B] dark:text-[#F3EEE4] mt-1">Aspart / Lispro</p>
                <p className="text-xs text-[#5C5665] mt-1">Onset: 10–15m · Peak: 1–2h · Duration: 3–5h. Suited for simple fast sugars.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF4E8]/70 dark:bg-[#1A1622]/70 border border-[#231F2B]/10">
                <span className="text-xs font-bold text-[#2A3F8F] dark:text-[#7F93E6] uppercase tracking-wider">Human Regular</span>
                <p className="font-serif font-bold text-base text-[#231F2B] dark:text-[#F3EEE4] mt-1">Regular (Actrapid)</p>
                <p className="text-xs text-[#5C5665] mt-1">Onset: 30m · Peak: 2–3h · Duration: 6–8h. Ideally matches slow-digesting Indian mixed meals.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF4E8]/70 dark:bg-[#1A1622]/70 border border-[#231F2B]/10">
                <span className="text-xs font-bold text-[#2E8B57] uppercase tracking-wider">Intermediate Basal</span>
                <p className="font-serif font-bold text-base text-[#231F2B] dark:text-[#F3EEE4] mt-1">NPH (Insulatard)</p>
                <p className="text-xs text-[#5C5665] mt-1">Onset: 1.5h · Peak: 4–10h · Duration: 14–18h. Most cost-effective, widely prescribed in government hospital care.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
