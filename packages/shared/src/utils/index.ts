// Shared Utility Functions

import { format, parseISO, addMinutes, differenceInMinutes, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// DATE/TIME UTILITIES
// ============================================

/** Indian Standard Time zone */
export const IST_TIMEZONE = 'Asia/Kolkata';

/** Format date to ISO string in IST */
export function toISTISO(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: IST_TIMEZONE });
}

/** Parse ISO string and return Date in IST */
export function fromISTISO(isoString: string): Date {
  return parseISO(isoString);
}

/** Get current time in IST */
export function nowIST(): Date {
  return new Date();
}

/** Round timestamp to nearest 5-minute interval (for CGM alignment) */
export function roundTo5Min(date: Date): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 5) * 5;
  const result = new Date(date);
  result.setMinutes(roundedMinutes, 0, 0);
  return result;
}

/** Generate 5-minute interval timestamps for a date range */
export function generate5MinIntervals(start: Date, end: Date): Date[] {
  const intervals: Date[] = [];
  let current = roundTo5Min(start);
  const roundedEnd = roundTo5Min(end);

  while (current <= roundedEnd) {
    intervals.push(new Date(current));
    current = addMinutes(current, 5);
  }

  return intervals;
}

/** Calculate minutes between two dates */
export function minutesBetween(start: Date, end: Date): number {
  return differenceInMinutes(end, start);
}

/** Check if date is valid */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && isValid(date);
}

// ============================================
// ID GENERATION
// ============================================

/** Generate UUID v4 */
export function generateId(): string {
  return uuidv4();
}

/** Generate short ID (8 chars) for client-facing identifiers */
export function generateShortId(): string {
  return uuidv4().slice(0, 8);
}

// ============================================
// INSULIN PHARMACOKINETICS (Indian Regimens)
// ============================================

export interface InsulinPKParams {
  ka: number;      // absorption rate constant (min^-1)
  ke: number;      // elimination rate constant (min^-1)
  tMax: number;    // time to peak (minutes)
  bioavailability: number;
}

export const INSULIN_PK_PARAMS: Record<string, InsulinPKParams> = {
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
    ka: 0.008,  // regular component
    ke: 0.003,  // NPH component dominant
    tMax: 240,
    bioavailability: 0.72,
  },
  glargine: {
    ka: 0.001,
    ke: 0.0008,
    tMax: 0,    // flat profile
    bioavailability: 0.90,
  },
  degludec: {
    ka: 0.0008,
    ke: 0.0006,
    tMax: 0,    // ultra-long flat
    bioavailability: 0.95,
  },
};

/** Calculate Insulin On Board (IOB) using two-compartment model */
export function calculateIOB(
  doseU: number,
  minutesSinceInjection: number,
  insulinType: keyof typeof INSULIN_PK_PARAMS
): number {
  const params = INSULIN_PK_PARAMS[insulinType];
  if (!params || minutesSinceInjection < 0) return 0;

  const t = minutesSinceInjection;
  const { ka, ke, bioavailability } = params;

  if (ka === ke) {
    // Single compartment approximation
    return doseU * bioavailability * (1 - Math.exp(-ka * t)) * Math.exp(-ke * t);
  }

  // Two-compartment: IOB = Dose * ka/(ka-ke) * (e^(-ke*t) - e^(-ka*t))
  const iob = doseU * bioavailability * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
  return Math.max(0, iob);
}

/** Calculate IOB for multiple injections */
export function calculateTotalIOB(
  injections: Array<{ doseU: number; minutesAgo: number; type: keyof typeof INSULIN_PK_PARAMS }>
): number {
  return injections.reduce((sum, inj) => sum + calculateIOB(inj.doseU, inj.minutesAgo, inj.type), 0);
}

// ============================================
// CARB ABSORPTION (Indian Meals)
// ============================================

export interface CarbAbsorptionPhase {
  name: 'rapid' | 'intermediate' | 'slow';
  fraction: number;
  kAbs: number;
  delayMin: number;
}

export const INDIAN_CARB_ABSORPTION: Record<string, CarbAbsorptionPhase[]> = {
  default: [
    { name: 'rapid', fraction: 0.30, kAbs: 0.045, delayMin: 0 },
    { name: 'intermediate', fraction: 0.50, kAbs: 0.025, delayMin: 15 },
    { name: 'slow', fraction: 0.20, kAbs: 0.012, delayMin: 45 },
  ],
  south_indian_breakfast: [
    { name: 'rapid', fraction: 0.40, kAbs: 0.045, delayMin: 0 },
    { name: 'intermediate', fraction: 0.50, kAbs: 0.025, delayMin: 15 },
    { name: 'slow', fraction: 0.10, kAbs: 0.012, delayMin: 45 },
  ],
  north_indian_lunch: [
    { name: 'rapid', fraction: 0.20, kAbs: 0.045, delayMin: 0 },
    { name: 'intermediate', fraction: 0.50, kAbs: 0.025, delayMin: 15 },
    { name: 'slow', fraction: 0.30, kAbs: 0.012, delayMin: 45 },
  ],
  bengali_lunch: [
    { name: 'rapid', fraction: 0.25, kAbs: 0.045, delayMin: 0 },
    { name: 'intermediate', fraction: 0.45, kAbs: 0.025, delayMin: 15 },
    { name: 'slow', fraction: 0.30, kAbs: 0.012, delayMin: 45 },
  ],
  gujarati_thali: [
    { name: 'rapid', fraction: 0.30, kAbs: 0.045, delayMin: 0 },
    { name: 'intermediate', fraction: 0.40, kAbs: 0.025, delayMin: 15 },
    { name: 'slow', fraction: 0.30, kAbs: 0.012, delayMin: 45 },
  ],
  mughlai_dinner: [
    { name: 'rapid', fraction: 0.15, kAbs: 0.045, delayMin: 0 },
    { name: 'intermediate', fraction: 0.45, kAbs: 0.025, delayMin: 15 },
    { name: 'slow', fraction: 0.40, kAbs: 0.012, delayMin: 45 },
  ],
  snack_fried: [
    { name: 'rapid', fraction: 0.35, kAbs: 0.045, delayMin: 0 },
    { name: 'intermediate', fraction: 0.45, kAbs: 0.025, delayMin: 15 },
    { name: 'slow', fraction: 0.20, kAbs: 0.012, delayMin: 45 },
  ],
  fruit_snack: [
    { name: 'rapid', fraction: 0.60, kAbs: 0.045, delayMin: 0 },
    { name: 'intermediate', fraction: 0.30, kAbs: 0.025, delayMin: 15 },
    { name: 'slow', fraction: 0.10, kAbs: 0.012, delayMin: 45 },
  ],
};

/** Generate carb absorption curve (g/min) for given meal */
export function generateAbsorptionCurve(
  totalCarbsG: number,
  mealType: string = 'default',
  durationMin: number = 240
): number[] {
  const phases = INDIAN_CARB_ABSORPTION[mealType] || INDIAN_CARB_ABSORPTION.default;
  const curve = new Array(durationMin).fill(0);

  for (const phase of phases) {
    const phaseCarbs = totalCarbsG * phase.fraction;
    const k = phase.kAbs;
    const delay = phase.delayMin;

    for (let t = delay; t < durationMin; t++) {
      // Gamma-like absorption: rate = carbs * k * e^(-k*(t-delay))
      const rate = phaseCarbs * k * Math.exp(-k * (t - delay));
      curve[t] += rate;
    }
  }

  return curve;
}

/** Get absorption profile for API response */
export function getAbsorptionProfile(
  totalCarbsG: number,
  mealType: string = 'default'
): { phases: Array<{ name: string; carbsG: number; kAbs: number; delayMin: number }> } {
  const phases = INDIAN_CARB_ABSORPTION[mealType] || INDIAN_CARB_ABSORPTION.default;
  return {
    phases: phases.map((p) => ({
      name: p.name,
      carbsG: Math.round(totalCarbsG * p.fraction * 10) / 10,
      kAbs: p.kAbs,
      delayMin: p.delayMin,
    })),
  };
}

// ============================================
// UNIT CONVERSIONS
// ============================================

/** Convert mmol/L to mg/dL */
export function mmolToMgDl(mmol: number): number {
  return Math.round(mmol * 18.018);
}

/** Convert mg/dL to mmol/L */
export function mgDlToMmol(mgDl: number): number {
  return Math.round((mgDl / 18.018) * 10) / 10;
}

/** Convert grams to typical Indian serving units */
export function gramsToServings(grams: number, typicalServingG: number): number {
  return Math.round((grams / typicalServingG) * 10) / 10;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/** Validate glucose value (mg/dL) */
export function validateGlucose(value: number): boolean {
  return Number.isInteger(value) && value >= 20 && value <= 400;
}

/** Validate insulin dose (U) */
export function validateInsulinDose(value: number): boolean {
  return typeof value === 'number' && value > 0 && value <= 50;
}

/** Validate carb amount (g) */
export function validateCarbs(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 300;
}

/** Validate ICR (g/U) */
export function validateICR(value: number): boolean {
  return typeof value === 'number' && value > 0 && value <= 100;
}

/** Validate ISF (mg/dL/U) */
export function validateISF(value: number): boolean {
  return typeof value === 'number' && value > 0 && value <= 200;
}

// ============================================
// FORMATTERS
// ============================================

/** Format glucose for display */
export function formatGlucose(mgDl: number, showUnit = true): string {
  return `${mgDl}${showUnit ? ' mg/dL' : ''}`;
}

/** Format insulin dose for display */
export function formatInsulinDose(units: number): string {
  return `${units.toFixed(1)} U`;
}

/** Format carbs for display */
export function formatCarbs(grams: number): string {
  return `${Math.round(grams)} g`;
}

/** Format time ago (e.g., "5 min ago", "2 hr ago") */
export function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

// ============================================
// INDIAN-SPECIFIC HELPERS
// ============================================

/** Common Indian reference objects for portion estimation */
export const INDIAN_REFERENCE_OBJECTS = {
  katori: { name: 'katori', volumeMl: 150, weightG: 150 },
  smallKatori: { name: 'small katori', volumeMl: 100, weightG: 100 },
  chapati: { name: 'chapati', weightG: 30 },
  smallChapati: { name: 'small chapati', weightG: 20 },
  largeChapati: { name: 'large chapati', weightG: 40 },
  tablespoon: { name: 'tablespoon', volumeMl: 15, weightG: 15 },
  teaspoon: { name: 'teaspoon', volumeMl: 5, weightG: 5 },
  ladle: { name: 'ladle', volumeMl: 60, weightG: 60 },
  glass: { name: 'glass', volumeMl: 200, weightG: 200 },
  smallGlass: { name: 'small glass', volumeMl: 150, weightG: 150 },
} as const;

/** Estimate portion from reference object */
export function estimatePortionFromReference(
  referenceKey: keyof typeof INDIAN_REFERENCE_OBJECTS,
  count: number = 1
): number {
  const ref = INDIAN_REFERENCE_OBJECTS[referenceKey];
  return ref.weightG * count;
}

/** Get meal type from time of day (Indian context) */
export function getMealTypeFromTime(date: Date): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}