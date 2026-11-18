// Bolus Calculation Utility
// Shared between API and ML Service

export interface BolusInput {
  carbsG: number;
  currentGlucose: number;
  iobRapid: number;
  iobRegular: number;
  iobNph: number;
  icr: number;
  isf: number;
  target: number;
  regimen: 'BASAL_BOLUS' | 'NPH_REGULAR' | 'PREMIXED_30_70' | 'PREMIXED_50_50' | 'PUMP';
  recentHypo: boolean;
  timeSinceLastMealMin?: number;
}

export interface BolusOutput {
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

export const INSULIN_SAFETY = {
  MAX_BOLUS_U: 15.0,
  MAX_CORRECTION_U: 5.0,
  MIN_GLUCOSE_FOR_CORRECTION: 90,
  TARGET_GLUCOSE: 110,
  MIN_PREDICTED_GLUCOSE: 70,
  IOB_HIGH_THRESHOLD_U: 3.0,
  RECENT_HYPO_WINDOW_MIN: 120,
  MAX_IOB_ADJUSTMENT_FACTOR: 0.5,
} as const;

/**
 * Calculate insulin bolus recommendation with safety checks
 */
export function calculateBolus(input: BolusInput): BolusOutput {
  const {
    carbsG,
    currentGlucose,
    iobRapid,
    iobRegular,
    iobNph,
    icr,
    isf,
    target,
    regimen,
    recentHypo,
    timeSinceLastMealMin,
  } = input;

  const warnings: string[] = [];
  let mealBolus = 0;
  let correctionBolus = 0;

  // 1. Meal bolus
  if (carbsG > 0 && icr > 0) {
    mealBolus = carbsG / icr;
  }

  // 2. Correction bolus
  if (currentGlucose > target && !recentHypo && currentGlucose >= INSULIN_SAFETY.MIN_GLUCOSE_FOR_CORRECTION) {
    correctionBolus = (currentGlucose - target) / isf;
    correctionBolus = Math.min(correctionBolus, INSULIN_SAFETY.MAX_CORRECTION_U);
  }

  // 3. IOB adjustment
  const totalIob = iobRapid + iobRegular * 0.5 + iobNph * 0.3;
  let iobAdjustment = 0;
  if (totalIob > INSULIN_SAFETY.IOB_HIGH_THRESHOLD_U) {
    warnings.push(`High IOB (${totalIob.toFixed(1)}U) - consider reducing bolus`);
    iobAdjustment = Math.max(0, (totalIob - INSULIN_SAFETY.IOB_HIGH_THRESHOLD_U) * INSULIN_SAFETY.MAX_IOB_ADJUSTMENT_FACTOR);
  }

  // 4. Regimen-specific adjustments
  let regimenAdjustment = 0;
  if (regimen === 'NPH_REGULAR' && timeSinceLastMealMin && timeSinceLastMealMin >= 240 && timeSinceLastMealMin <= 480) {
    warnings.push('Morning NPH may be peaking - consider 20% bolus reduction');
    regimenAdjustment = -0.2 * (iobRapid + iobRegular);
  } else if (regimen === 'PREMIXED_30_70' && timeSinceLastMealMin && timeSinceLastMealMin >= 180 && timeSinceLastMealMin <= 360) {
    warnings.push('Premixed NPH component active - reduced correction recommended');
    regimenAdjustment = -0.15 * iobNph;
  }

  // 5. Total bolus
  let totalBolus = mealBolus + correctionBolus - iobAdjustment + regimenAdjustment;
  totalBolus = Math.max(0, totalBolus);

  // 6. Safety cap
  const maxAllowed = INSULIN_SAFETY.MAX_BOLUS_U;
  if (totalBolus > maxAllowed) {
    warnings.push(`Calculated bolus (${totalBolus.toFixed(1)}U) exceeds max (${maxAllowed}U)`);
    totalBolus = maxAllowed;
  }

  // 7. Predicted glucose floor check
  const predictedDrop = totalBolus * isf;
  const predictedMin = currentGlucose - predictedDrop;
  if (predictedMin < INSULIN_SAFETY.MIN_PREDICTED_GLUCOSE) {
    warnings.push(`Predicted glucose may drop to ${Math.round(predictedMin)} mg/dL`);
    const safeBolus = (currentGlucose - 80) / isf;
    totalBolus = Math.min(totalBolus, Math.max(0, safeBolus));
  }

  // 8. Recent hypo warning
  if (recentHypo) {
    warnings.push('Recent hypoglycemia detected - consider reducing bolus by 25-50%');
  }

  // Generate explanation
  const explanationParts = [
    `Meal bolus: ${mealBolus.toFixed(1)}U (${carbsG}g / ${icr}g/U)`,
    correctionBolus > 0
      ? `Correction: ${correctionBolus.toFixed(1)}U ((${currentGlucose}-${target}) / ${isf})`
      : 'No correction needed',
    iobAdjustment > 0 ? `IOB adjustment: -${iobAdjustment.toFixed(1)}U` : '',
    regimenAdjustment !== 0 ? `Regimen adjustment: ${regimenAdjustment > 0 ? '+' : ''}${regimenAdjustment.toFixed(1)}U` : '',
  ].filter(Boolean);

  return {
    mealBolusU: Math.round(mealBolus * 10) / 10,
    correctionBolusU: Math.round(correctionBolus * 10) / 10,
    totalBolusU: Math.round(totalBolus * 10) / 10,
    maxAllowedU: maxAllowed,
    warnings,
    explanation: explanationParts.join('; '),
    safetyCheck: {
      predictedMinGlucose: Math.round(predictedMin),
      iobTotalU: Math.round(totalIob * 10) / 10,
    },
  };
}

/**
 * Calculate IOB for a single insulin dose
 */
export function calculateIOB(
  doseU: number,
  minutesSinceInjection: number,
  insulinType: 'rapid' | 'regular' | 'nph' | 'premixed_30_70'
): number {
  const params = INSULIN_PK_PARAMS[insulinType];
  if (!params || minutesSinceInjection < 0) return 0;

  const t = minutesSinceInjection;
  const { ka, ke, bioavailability } = params;

  if (ka === ke) {
    return doseU * bioavailability * (1 - Math.exp(-ka * t)) * Math.exp(-ke * t);
  }

  const iob = doseU * bioavailability * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
  return Math.max(0, iob);
}

export const INSULIN_PK_PARAMS = {
  rapid: {
    ka: 0.018,
    ke: 0.012,
    tMax: 60,
    bioavailability: 0.85,
  },
  regular: {
    ka: 0.008,
    ke: 0.006,
    tMax: 120,
    bioavailability: 0.75,
  },
  nph: {
    ka: 0.003,
    ke: 0.002,
    tMax: 360,
    bioavailability: 0.70,
  },
  premixed_30_70: {
    ka: 0.008,
    ke: 0.003,
    tMax: 240,
    bioavailability: 0.72,
  },
} as const;