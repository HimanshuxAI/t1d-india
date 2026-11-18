// Shared Type Definitions for T1D India Application
// Used by both API and ML Service

import { z } from 'zod';

// ============================================
// ENUMS (mirror Prisma enums)
// ============================================

export enum UserRole {
  PATIENT = 'PATIENT',
  CAREGIVER = 'CAREGIVER',
  CLINICIAN = 'CLINICIAN',
  ADMIN = 'ADMIN',
}

export enum DiabetesType {
  T1D = 'T1D',
  T2D = 'T2D',
  LADA = 'LADA',
  MODY = 'MODY',
  OTHER = 'OTHER',
}

export enum InsulinRegimen {
  BASAL_BOLUS = 'BASAL_BOLUS',
  NPH_REGULAR = 'NPH_REGULAR',
  PREMIXED_30_70 = 'PREMIXED_30_70',
  PREMIXED_50_50 = 'PREMIXED_50_50',
  PUMP = 'PUMP',
  OTHER = 'OTHER',
}

export enum CGMType {
  DEXCOM_G6 = 'DEXCOM_G6',
  DEXCOM_G7 = 'DEXCOM_G7',
  LIBRE_2 = 'LIBRE_2',
  LIBRE_3 = 'LIBRE_3',
  MEDTRONIC_G3 = 'MEDTRONIC_G3',
  MEDTRONIC_G4 = 'MEDTRONIC_G4',
  NONE = 'NONE',
}

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
  PRE_WORKOUT = 'PRE_WORKOUT',
  POST_WORKOUT = 'POST_WORKOUT',
  BEDTIME = 'BEDTIME',
}

export enum InputMethod {
  TEXT_SEARCH = 'TEXT_SEARCH',
  VOICE = 'VOICE',
  PHOTO_OCR = 'PHOTO_OCR',
  PHOTO_ML = 'PHOTO_ML',
  BARCODE = 'BARCODE',
  COMPOSITE_SELECT = 'COMPOSITE_SELECT',
  MANUAL = 'MANUAL',
}

export enum LocationType {
  HOME = 'HOME',
  WORK = 'WORK',
  SCHOOL = 'SCHOOL',
  RESTAURANT = 'RESTAURANT',
  TRAVEL = 'TRAVEL',
  OTHER = 'OTHER',
}

export enum InsulinType {
  RAPID_LISPRO = 'RAPID_LISPRO',
  RAPID_ASPART = 'RAPID_ASPART',
  RAPID_GLULISINE = 'RAPID_GLULISINE',
  REGULAR_HUMAN = 'REGULAR_HUMAN',
  NPH_HUMAN = 'NPH_HUMAN',
  PREMIXED_30_70 = 'PREMIXED_30_70',
  PREMIXED_50_50 = 'PREMIXED_50_50',
  PREMIXED_25_75 = 'PREMIXED_25_75',
  GLARGINE_U100 = 'GLARGINE_U100',
  GLARGINE_U300 = 'GLARGINE_U300',
  DEGLUDEC_U100 = 'DEGLUDEC_U100',
  DEGLUDEC_U200 = 'DEGLUDEC_U200',
  BASAL_PUMP = 'BASAL_PUMP',
}

export enum InjectionSite {
  ABDOMEN = 'ABDOMEN',
  THIGH = 'THIGH',
  ARM = 'ARM',
  BUTTOCK = 'BUTTOCK',
  PUMP_SITE = 'PUMP_SITE',
}

export enum DeliveryMethod {
  PEN = 'PEN',
  SYRINGE = 'SYRINGE',
  PUMP = 'PUMP',
  INHALER = 'INHALER',
}

export enum AlertLevel {
  WARNING = 'WARNING',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum CGMSource {
  DEXCOM_API = 'DEXCOM_API',
  LIBRE_API = 'LIBRE_API',
  MEDTRONIC_API = 'MEDTRONIC_API',
  BLUETOOTH = 'BLUETOOTH',
  MANUAL = 'MANUAL',
  SIMULATED = 'SIMULATED',
}

// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================

// Food item in meal log
export const MealItemSchema = z.object({
  foodId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  quantityG: z.number().positive().max(2000),
  prepMethod: z
    .enum(['raw', 'boiled', 'steamed', 'fried', 'roasted', 'baked', 'pressure_cooked', 'sauteed'])
    .default('boiled'),
  carbsOverrideG: z.number().positive().optional(),
});

export type MealItem = z.infer<typeof MealItemSchema>;

// Absorption phase
export const AbsorptionPhaseSchema = z.object({
  name: z.enum(['rapid', 'intermediate', 'slow']),
  carbsG: z.number().nonnegative(),
  kAbs: z.number().positive(),
  delayMin: z.number().nonnegative(),
});

export type AbsorptionPhase = z.infer<typeof AbsorptionPhaseSchema>;

// Absorption profile
export const AbsorptionProfileSchema = z.object({
  phases: z.array(AbsorptionPhaseSchema).min(1).max(3),
});

export type AbsorptionProfile = z.infer<typeof AbsorptionProfileSchema>;

// Indian carb options for hypo treatment
export const IndianCarbOptionSchema = z.object({
  item: z.string(),
  quantity: z.string(),
  carbsG: z.number().positive(),
});

export type IndianCarbOption = z.infer<typeof IndianCarbOptionSchema>;

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// Meal Logging
export const CreateMealLogSchema = z.object({
  mealTime: z.string().datetime(),
  mealType: z.nativeEnum(MealType),
  items: z.array(MealItemSchema).min(1).max(20),
  inputMethod: z.nativeEnum(InputMethod),
  locationType: z.nativeEnum(LocationType).optional(),
  hungerLevel: z.number().int().min(1).max(10).optional(),
  moodTag: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateMealLogInput = z.infer<typeof CreateMealLogSchema>;

export const MealLogResponseSchema = z.object({
  id: z.string().uuid(),
  totalCarbsG: z.number(),
  totalProteinG: z.number().optional(),
  totalFatG: z.number().optional(),
  totalFiberG: z.number().optional(),
  absorptionProfile: AbsorptionProfileSchema.optional(),
  loggedAt: z.string().datetime(),
});

export type MealLogResponse = z.infer<typeof MealLogResponseSchema>;

// Food Search
export const FoodSearchParamsSchema = z.object({
  q: z.string().min(1).max(100),
  locale: z.enum(['en', 'hi', 'ta', 'te', 'mr', 'gu', 'bn']).default('en'),
  category: z.string().optional(),
  region: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type FoodSearchParams = z.infer<typeof FoodSearchParamsSchema>;

export const FoodSearchResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  nameLocalized: z.string(),
  category: z.string(),
  carbsPer100g: z.number(),
  typicalServingG: z.number().optional(),
  servingDescription: z.string().optional(),
  confidenceScore: z.number(),
});

export type FoodSearchResult = z.infer<typeof FoodSearchResultSchema>;

// CGM Batch Upload
export const CGMReadingInputSchema = z.object({
  time: z.string().datetime(),
  glucoseMgDl: z.number().int().min(20).max(400),
  trend: z.number().int().min(-3).max(3).optional(),
  trendArrow: z.string().optional(),
  source: z.nativeEnum(CGMSource),
  deviceTimestamp: z.string().datetime().optional(),
});

export const CGMBatchUploadSchema = z.object({
  readings: z.array(CGMReadingInputSchema).min(1).max(288),
});

export type CGMBatchUploadInput = z.infer<typeof CGMBatchUploadSchema>;

export const CGMBatchUploadResponseSchema = z.object({
  accepted: z.number().int(),
  rejected: z.number().int(),
  errors: z.array(
    z.object({
      index: z.number().int(),
      code: z.string(),
      message: z.string(),
    })
  ),
});

export type CGMBatchUploadResponse = z.infer<typeof CGMBatchUploadResponseSchema>;

// Hypoglycemia Prediction
export const HypoPredictionResponseSchema = z.object({
  predictions: z.array(
    z.object({
      horizonMin: z.number().int(),
      glucoseP10: z.number().int(),
      glucoseP50: z.number().int(),
      glucoseP90: z.number().int(),
      hypoProbability: z.number().min(0).max(1),
      severeHypoProbability: z.number().min(0).max(1),
      topFeatures: z.array(
        z.object({
          feature: z.string(),
          contribution: z.number(),
        })
      ),
      predictedAt: z.string().datetime(),
      modelVersion: z.string(),
    })
  ),
});

export type HypoPredictionResponse = z.infer<typeof HypoPredictionResponseSchema>;

// Bolus Calculation
export const BolusCalculationRequestSchema = z.object({
  carbsG: z.number().min(0).max(300),
  currentGlucoseMgDl: z.number().int().min(30).max(400),
  mealType: z.nativeEnum(MealType).optional(),
  icrGPerU: z.number().positive().max(100).optional(),
  isfMgDlPerU: z.number().positive().max(200).optional(),
  regimen: z.nativeEnum(InsulinRegimen).optional(),
});

export type BolusCalculationRequest = z.infer<typeof BolusCalculationRequestSchema>;

export const BolusCalculationResponseSchema = z.object({
  mealBolusU: z.number(),
  correctionBolusU: z.number(),
  totalBolusU: z.number(),
  maxAllowedU: z.number(),
  warnings: z.array(z.string()),
  explanation: z.string(),
  safetyCheck: z.object({
    predictedMinGlucose: z.number().int(),
    iobTotalU: z.number(),
  }),
});

export type BolusCalculationResponse = z.infer<typeof BolusCalculationResponseSchema>;

// Insulin Log
export const CreateInsulinLogSchema = z.object({
  administeredAt: z.string().datetime(),
  insulinType: z.nativeEnum(InsulinType),
  doseU: z.number().positive().max(50),
  injectionSite: z.nativeEnum(InjectionSite),
  relatedMealLogId: z.string().uuid().optional(),
  glucoseAtInjection: z.number().int().min(20).max(400).optional(),
  carbEstimateG: z.number().positive().optional(),
  calculatorRecommendedU: z.number().positive().optional(),
  overrideReason: z.string().max(500).optional(),
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  deviceId: z.string().optional(),
});

export type CreateInsulinLogInput = z.infer<typeof CreateInsulinLogSchema>;

// Patient Profile
export const PatientProfileSchema = z.object({
  dateOfBirth: z.string().date(),
  gender: z.enum(['male', 'female', 'other']),
  heightCm: z.number().positive().max(300).optional(),
  weightKg: z.number().positive().max(200).optional(),
  diabetesType: z.nativeEnum(DiabetesType),
  diagnosisDate: z.string().date().optional(),
  hba1cLatest: z.number().min(3).max(15).optional(),
  insulinRegimen: z.nativeEnum(InsulinRegimen),
  icrGPerU: z.number().positive().max(100).optional(),
  isfMgDlPerU: z.number().positive().max(200).optional(),
  targetGlucoseMgDl: z.number().int().min(70).max(180).default(110),
  basalRateUPerHr: z.number().positive().max(10).optional(),
  nphMorningU: z.number().positive().max(50).optional(),
  nphEveningU: z.number().positive().max(50).optional(),
  regularBreakfastU: z.number().positive().max(50).optional(),
  regularLunchU: z.number().positive().max(50).optional(),
  regularDinnerU: z.number().positive().max(50).optional(),
  cgmType: z.nativeEnum(CGMType).optional(),
  cgmSerialHash: z.string().optional(),
  pumpType: z.string().optional(),
  hypoThresholdMgDl: z.number().int().min(50).max(100).default(70),
  severeHypoThresholdMgDl: z.number().int().min(40).max(70).default(54),
  alertSoundEnabled: z.boolean().default(true),
  caregiverShareEnabled: z.boolean().default(false),
  dataSharingConsent: z.boolean().default(false),
  researchConsent: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
});

export type PatientProfileInput = z.infer<typeof PatientProfileSchema>;

// ============================================
// ML SERVICE TYPES
// ============================================

export interface HypoPredictionInput {
  // Time-series features (last 30 min @ 5-min intervals = 6 steps)
  glucose: number[];           // length 6
  roc: number[];               // length 6
  iobRapid: number[];          // length 6
  ioBRegular: number[];        // length 6
  iobNph: number[];            // length 6
  carbsAbsorbing: number[];    // length 6
  steps5min: number[];         // length 6
  hr: number[];                // length 6

  // Static features
  age: number;
  weight: number;
  diabetesDurationYears: number;
  isf: number;
  icr: number;
  regimenType: number;         // 0=basal_bolus, 1=nph_regular, 2=premixed, 3=pump
  hypoUnawareness: number;     // 0 or 1
}

export interface HypoPredictionOutput {
  glucoseP10: number;
  glucoseP50: number;
  glucoseP90: number;
  hypoProbability30min: number;
  hypoProbability60min: number;
  severeHypoProbability30min: number;
  topFeatures: Array<{ feature: string; contribution: number }>;
}

export interface CarbEstimationInput {
  imageBase64: string;         // Base64 encoded JPEG/PNG
  mealTypeHint?: string;
}

export interface CarbEstimationOutput {
  foodClass: string;
  foodClassConfidence: number;
  portionG: number;
  carbsG: number;
  carbsConfidence: number;
  attentionMap?: string;       // Base64 encoded heatmap
}

export interface BolusCalculationInput {
  carbsG: number;
  currentGlucose: number;
  iobRapid: number;
  iobRegular: number;
  iobNph: number;
  icr: number;
  isf: number;
  regimen: string;
  recentHypo: boolean;
  timeSinceLastMealMin?: number;
}

export interface BolusCalculationOutput {
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

// ============================================
// ERROR TYPES
// ============================================

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMITED', message, 429);
    this.name = 'RateLimitError';
  }
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParamsInput = z.infer<typeof PaginationParamsSchema>;