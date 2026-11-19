"use strict";
// Shared Type Definitions for T1D India Application
// Used by both API and ML Service
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationParamsSchema = exports.RateLimitError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = exports.PatientProfileSchema = exports.CreateInsulinLogSchema = exports.BolusCalculationResponseSchema = exports.BolusCalculationRequestSchema = exports.HypoPredictionResponseSchema = exports.CGMBatchUploadResponseSchema = exports.CGMBatchUploadSchema = exports.CGMReadingInputSchema = exports.FoodSearchResultSchema = exports.FoodSearchParamsSchema = exports.MealLogResponseSchema = exports.CreateMealLogSchema = exports.IndianCarbOptionSchema = exports.AbsorptionProfileSchema = exports.AbsorptionPhaseSchema = exports.MealItemSchema = exports.CGMSource = exports.AlertLevel = exports.DeliveryMethod = exports.InjectionSite = exports.InsulinType = exports.LocationType = exports.InputMethod = exports.MealType = exports.CGMType = exports.InsulinRegimen = exports.DiabetesType = exports.UserRole = void 0;
const zod_1 = require("zod");
// ============================================
// ENUMS (mirror Prisma enums)
// ============================================
var UserRole;
(function (UserRole) {
    UserRole["PATIENT"] = "PATIENT";
    UserRole["CAREGIVER"] = "CAREGIVER";
    UserRole["CLINICIAN"] = "CLINICIAN";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var DiabetesType;
(function (DiabetesType) {
    DiabetesType["T1D"] = "T1D";
    DiabetesType["T2D"] = "T2D";
    DiabetesType["LADA"] = "LADA";
    DiabetesType["MODY"] = "MODY";
    DiabetesType["OTHER"] = "OTHER";
})(DiabetesType || (exports.DiabetesType = DiabetesType = {}));
var InsulinRegimen;
(function (InsulinRegimen) {
    InsulinRegimen["BASAL_BOLUS"] = "BASAL_BOLUS";
    InsulinRegimen["NPH_REGULAR"] = "NPH_REGULAR";
    InsulinRegimen["PREMIXED_30_70"] = "PREMIXED_30_70";
    InsulinRegimen["PREMIXED_50_50"] = "PREMIXED_50_50";
    InsulinRegimen["PUMP"] = "PUMP";
    InsulinRegimen["OTHER"] = "OTHER";
})(InsulinRegimen || (exports.InsulinRegimen = InsulinRegimen = {}));
var CGMType;
(function (CGMType) {
    CGMType["DEXCOM_G6"] = "DEXCOM_G6";
    CGMType["DEXCOM_G7"] = "DEXCOM_G7";
    CGMType["LIBRE_2"] = "LIBRE_2";
    CGMType["LIBRE_3"] = "LIBRE_3";
    CGMType["MEDTRONIC_G3"] = "MEDTRONIC_G3";
    CGMType["MEDTRONIC_G4"] = "MEDTRONIC_G4";
    CGMType["NONE"] = "NONE";
})(CGMType || (exports.CGMType = CGMType = {}));
var MealType;
(function (MealType) {
    MealType["BREAKFAST"] = "BREAKFAST";
    MealType["LUNCH"] = "LUNCH";
    MealType["DINNER"] = "DINNER";
    MealType["SNACK"] = "SNACK";
    MealType["PRE_WORKOUT"] = "PRE_WORKOUT";
    MealType["POST_WORKOUT"] = "POST_WORKOUT";
    MealType["BEDTIME"] = "BEDTIME";
})(MealType || (exports.MealType = MealType = {}));
var InputMethod;
(function (InputMethod) {
    InputMethod["TEXT_SEARCH"] = "TEXT_SEARCH";
    InputMethod["VOICE"] = "VOICE";
    InputMethod["PHOTO_OCR"] = "PHOTO_OCR";
    InputMethod["PHOTO_ML"] = "PHOTO_ML";
    InputMethod["BARCODE"] = "BARCODE";
    InputMethod["COMPOSITE_SELECT"] = "COMPOSITE_SELECT";
    InputMethod["MANUAL"] = "MANUAL";
})(InputMethod || (exports.InputMethod = InputMethod = {}));
var LocationType;
(function (LocationType) {
    LocationType["HOME"] = "HOME";
    LocationType["WORK"] = "WORK";
    LocationType["SCHOOL"] = "SCHOOL";
    LocationType["RESTAURANT"] = "RESTAURANT";
    LocationType["TRAVEL"] = "TRAVEL";
    LocationType["OTHER"] = "OTHER";
})(LocationType || (exports.LocationType = LocationType = {}));
var InsulinType;
(function (InsulinType) {
    InsulinType["RAPID_LISPRO"] = "RAPID_LISPRO";
    InsulinType["RAPID_ASPART"] = "RAPID_ASPART";
    InsulinType["RAPID_GLULISINE"] = "RAPID_GLULISINE";
    InsulinType["REGULAR_HUMAN"] = "REGULAR_HUMAN";
    InsulinType["NPH_HUMAN"] = "NPH_HUMAN";
    InsulinType["PREMIXED_30_70"] = "PREMIXED_30_70";
    InsulinType["PREMIXED_50_50"] = "PREMIXED_50_50";
    InsulinType["PREMIXED_25_75"] = "PREMIXED_25_75";
    InsulinType["GLARGINE_U100"] = "GLARGINE_U100";
    InsulinType["GLARGINE_U300"] = "GLARGINE_U300";
    InsulinType["DEGLUDEC_U100"] = "DEGLUDEC_U100";
    InsulinType["DEGLUDEC_U200"] = "DEGLUDEC_U200";
    InsulinType["BASAL_PUMP"] = "BASAL_PUMP";
})(InsulinType || (exports.InsulinType = InsulinType = {}));
var InjectionSite;
(function (InjectionSite) {
    InjectionSite["ABDOMEN"] = "ABDOMEN";
    InjectionSite["THIGH"] = "THIGH";
    InjectionSite["ARM"] = "ARM";
    InjectionSite["BUTTOCK"] = "BUTTOCK";
    InjectionSite["PUMP_SITE"] = "PUMP_SITE";
})(InjectionSite || (exports.InjectionSite = InjectionSite = {}));
var DeliveryMethod;
(function (DeliveryMethod) {
    DeliveryMethod["PEN"] = "PEN";
    DeliveryMethod["SYRINGE"] = "SYRINGE";
    DeliveryMethod["PUMP"] = "PUMP";
    DeliveryMethod["INHALER"] = "INHALER";
})(DeliveryMethod || (exports.DeliveryMethod = DeliveryMethod = {}));
var AlertLevel;
(function (AlertLevel) {
    AlertLevel["WARNING"] = "WARNING";
    AlertLevel["URGENT"] = "URGENT";
    AlertLevel["EMERGENCY"] = "EMERGENCY";
})(AlertLevel || (exports.AlertLevel = AlertLevel = {}));
var CGMSource;
(function (CGMSource) {
    CGMSource["DEXCOM_API"] = "DEXCOM_API";
    CGMSource["LIBRE_API"] = "LIBRE_API";
    CGMSource["MEDTRONIC_API"] = "MEDTRONIC_API";
    CGMSource["BLUETOOTH"] = "BLUETOOTH";
    CGMSource["MANUAL"] = "MANUAL";
    CGMSource["SIMULATED"] = "SIMULATED";
})(CGMSource || (exports.CGMSource = CGMSource = {}));
// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================
// Food item in meal log
exports.MealItemSchema = zod_1.z.object({
    foodId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).max(200),
    quantityG: zod_1.z.number().positive().max(2000),
    prepMethod: zod_1.z
        .enum(['raw', 'boiled', 'steamed', 'fried', 'roasted', 'baked', 'pressure_cooked', 'sauteed'])
        .default('boiled'),
    carbsOverrideG: zod_1.z.number().positive().optional(),
});
// Absorption phase
exports.AbsorptionPhaseSchema = zod_1.z.object({
    name: zod_1.z.enum(['rapid', 'intermediate', 'slow']),
    carbsG: zod_1.z.number().nonnegative(),
    kAbs: zod_1.z.number().positive(),
    delayMin: zod_1.z.number().nonnegative(),
});
// Absorption profile
exports.AbsorptionProfileSchema = zod_1.z.object({
    phases: zod_1.z.array(exports.AbsorptionPhaseSchema).min(1).max(3),
});
// Indian carb options for hypo treatment
exports.IndianCarbOptionSchema = zod_1.z.object({
    item: zod_1.z.string(),
    quantity: zod_1.z.string(),
    carbsG: zod_1.z.number().positive(),
});
// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================
// Meal Logging
exports.CreateMealLogSchema = zod_1.z.object({
    mealTime: zod_1.z.string().datetime(),
    mealType: zod_1.z.nativeEnum(MealType),
    items: zod_1.z.array(exports.MealItemSchema).min(1).max(20),
    inputMethod: zod_1.z.nativeEnum(InputMethod),
    locationType: zod_1.z.nativeEnum(LocationType).optional(),
    hungerLevel: zod_1.z.number().int().min(1).max(10).optional(),
    moodTag: zod_1.z.string().max(50).optional(),
    notes: zod_1.z.string().max(500).optional(),
});
exports.MealLogResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    totalCarbsG: zod_1.z.number(),
    totalProteinG: zod_1.z.number().optional(),
    totalFatG: zod_1.z.number().optional(),
    totalFiberG: zod_1.z.number().optional(),
    absorptionProfile: exports.AbsorptionProfileSchema.optional(),
    loggedAt: zod_1.z.string().datetime(),
});
// Food Search
exports.FoodSearchParamsSchema = zod_1.z.object({
    q: zod_1.z.string().min(1).max(100),
    locale: zod_1.z.enum(['en', 'hi', 'ta', 'te', 'mr', 'gu', 'bn']).default('en'),
    category: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
});
exports.FoodSearchResultSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    nameLocalized: zod_1.z.string(),
    category: zod_1.z.string(),
    carbsPer100g: zod_1.z.number(),
    typicalServingG: zod_1.z.number().optional(),
    servingDescription: zod_1.z.string().optional(),
    confidenceScore: zod_1.z.number(),
});
// CGM Batch Upload
exports.CGMReadingInputSchema = zod_1.z.object({
    time: zod_1.z.string().datetime(),
    glucoseMgDl: zod_1.z.number().int().min(20).max(400),
    trend: zod_1.z.number().int().min(-3).max(3).optional(),
    trendArrow: zod_1.z.string().optional(),
    source: zod_1.z.nativeEnum(CGMSource),
    deviceTimestamp: zod_1.z.string().datetime().optional(),
});
exports.CGMBatchUploadSchema = zod_1.z.object({
    readings: zod_1.z.array(exports.CGMReadingInputSchema).min(1).max(288),
});
exports.CGMBatchUploadResponseSchema = zod_1.z.object({
    accepted: zod_1.z.number().int(),
    rejected: zod_1.z.number().int(),
    errors: zod_1.z.array(zod_1.z.object({
        index: zod_1.z.number().int(),
        code: zod_1.z.string(),
        message: zod_1.z.string(),
    })),
});
// Hypoglycemia Prediction
exports.HypoPredictionResponseSchema = zod_1.z.object({
    predictions: zod_1.z.array(zod_1.z.object({
        horizonMin: zod_1.z.number().int(),
        glucoseP10: zod_1.z.number().int(),
        glucoseP50: zod_1.z.number().int(),
        glucoseP90: zod_1.z.number().int(),
        hypoProbability: zod_1.z.number().min(0).max(1),
        severeHypoProbability: zod_1.z.number().min(0).max(1),
        topFeatures: zod_1.z.array(zod_1.z.object({
            feature: zod_1.z.string(),
            contribution: zod_1.z.number(),
        })),
        predictedAt: zod_1.z.string().datetime(),
        modelVersion: zod_1.z.string(),
    })),
});
// Bolus Calculation
exports.BolusCalculationRequestSchema = zod_1.z.object({
    carbsG: zod_1.z.number().min(0).max(300),
    currentGlucoseMgDl: zod_1.z.number().int().min(30).max(400),
    mealType: zod_1.z.nativeEnum(MealType).optional(),
    icrGPerU: zod_1.z.number().positive().max(100).optional(),
    isfMgDlPerU: zod_1.z.number().positive().max(200).optional(),
    regimen: zod_1.z.nativeEnum(InsulinRegimen).optional(),
});
exports.BolusCalculationResponseSchema = zod_1.z.object({
    mealBolusU: zod_1.z.number(),
    correctionBolusU: zod_1.z.number(),
    totalBolusU: zod_1.z.number(),
    maxAllowedU: zod_1.z.number(),
    warnings: zod_1.z.array(zod_1.z.string()),
    explanation: zod_1.z.string(),
    safetyCheck: zod_1.z.object({
        predictedMinGlucose: zod_1.z.number().int(),
        iobTotalU: zod_1.z.number(),
    }),
});
// Insulin Log
exports.CreateInsulinLogSchema = zod_1.z.object({
    administeredAt: zod_1.z.string().datetime(),
    insulinType: zod_1.z.nativeEnum(InsulinType),
    doseU: zod_1.z.number().positive().max(50),
    injectionSite: zod_1.z.nativeEnum(InjectionSite),
    relatedMealLogId: zod_1.z.string().uuid().optional(),
    glucoseAtInjection: zod_1.z.number().int().min(20).max(400).optional(),
    carbEstimateG: zod_1.z.number().positive().optional(),
    calculatorRecommendedU: zod_1.z.number().positive().optional(),
    overrideReason: zod_1.z.string().max(500).optional(),
    deliveryMethod: zod_1.z.nativeEnum(DeliveryMethod),
    deviceId: zod_1.z.string().optional(),
});
// Patient Profile
exports.PatientProfileSchema = zod_1.z.object({
    dateOfBirth: zod_1.z.string().date(),
    gender: zod_1.z.enum(['male', 'female', 'other']),
    heightCm: zod_1.z.number().positive().max(300).optional(),
    weightKg: zod_1.z.number().positive().max(200).optional(),
    diabetesType: zod_1.z.nativeEnum(DiabetesType),
    diagnosisDate: zod_1.z.string().date().optional(),
    hba1cLatest: zod_1.z.number().min(3).max(15).optional(),
    insulinRegimen: zod_1.z.nativeEnum(InsulinRegimen),
    icrGPerU: zod_1.z.number().positive().max(100).optional(),
    isfMgDlPerU: zod_1.z.number().positive().max(200).optional(),
    targetGlucoseMgDl: zod_1.z.number().int().min(70).max(180).default(110),
    basalRateUPerHr: zod_1.z.number().positive().max(10).optional(),
    nphMorningU: zod_1.z.number().positive().max(50).optional(),
    nphEveningU: zod_1.z.number().positive().max(50).optional(),
    regularBreakfastU: zod_1.z.number().positive().max(50).optional(),
    regularLunchU: zod_1.z.number().positive().max(50).optional(),
    regularDinnerU: zod_1.z.number().positive().max(50).optional(),
    cgmType: zod_1.z.nativeEnum(CGMType).optional(),
    cgmSerialHash: zod_1.z.string().optional(),
    pumpType: zod_1.z.string().optional(),
    hypoThresholdMgDl: zod_1.z.number().int().min(50).max(100).default(70),
    severeHypoThresholdMgDl: zod_1.z.number().int().min(40).max(70).default(54),
    alertSoundEnabled: zod_1.z.boolean().default(true),
    caregiverShareEnabled: zod_1.z.boolean().default(false),
    dataSharingConsent: zod_1.z.boolean().default(false),
    researchConsent: zod_1.z.boolean().default(false),
    marketingConsent: zod_1.z.boolean().default(false),
});
// ============================================
// ERROR TYPES
// ============================================
class AppError extends Error {
    code;
    statusCode;
    details;
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super('VALIDATION_ERROR', message, 400, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', message, 401);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', message, 403);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message) {
        super('CONFLICT', message, 409);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super('RATE_LIMITED', message, 429);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
exports.PaginationParamsSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=index.js.map