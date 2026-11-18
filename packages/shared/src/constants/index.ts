// Shared Constants

// ============================================
// APPLICATION CONSTANTS
// ============================================

export const APP_NAME = 'T1D India';
export const APP_VERSION = '0.0.1';
export const API_PREFIX = '/api/v1';

// ============================================
// PAGINATION
// ============================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE = 1;

// ============================================
// RATE LIMITING
// ============================================

export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const RATE_LIMIT_AUTH_MAX = 10; // Stricter for auth endpoints

// ============================================
// CACHE TTL (seconds)
// ============================================

export const CACHE_TTL = {
  FOOD_SEARCH: 3600,        // 1 hour
  FOOD_DETAIL: 86400,       // 24 hours
  COMPOSITE_MEAL: 86400,    // 24 hours
  USER_PROFILE: 300,        // 5 minutes
  CGM_LATEST: 30,           // 30 seconds
  HYPO_PREDICTION: 60,      // 1 minute
  ML_MODEL_METADATA: 3600,  // 1 hour
} as const;

// ============================================
// GLUCOSE THRESHOLDS (mg/dL)
// ============================================

export const GLUCOSE_THRESHOLDS = {
  VERY_LOW: 54,      // Severe hypoglycemia
  LOW: 70,           // Hypoglycemia
  TARGET_LOW: 70,    // Lower bound of target range
  TARGET_HIGH: 180,  // Upper bound of target range
  HIGH: 180,         // Hyperglycemia
  VERY_HIGH: 250,    // Severe hyperglycemia
  CRITICAL_LOW: 40,  // Emergency
  CRITICAL_HIGH: 400,// Emergency
} as const;

// ============================================
// HYPOGLYCEMIA PREDICTION
// ============================================

export const HYPO_PREDICTION = {
  HORIZONS_MIN: [30, 60],
  DEFAULT_HORIZON_MIN: 30,
  SENSITIVITY_TARGET: 0.91,    // 91% sensitivity target
  SPECIFICITY_TARGET: 0.90,    // 90% specificity target
  MODEL_INPUT_WINDOW_MIN: 30,  // 30-min lookback
  MODEL_STEP_MIN: 5,           // 5-min resolution
  MODEL_STEPS: 6,              // 30/5 = 6 steps
  ALERT_COOLDOWN_MIN: 15,      // Minimum time between alerts
  MAX_ALERTS_PER_HOUR: 4,
} as const;

// ============================================
// INSULIN SAFETY LIMITS
// ============================================

export const INSULIN_SAFETY = {
  MAX_BOLUS_U: 15,
  MAX_CORRECTION_U: 5,
  MIN_GLUCOSE_FOR_CORRECTION: 90,
  TARGET_GLUCOSE: 110,
  MIN_PREDICTED_GLUCOSE: 70,
  IOB_HIGH_THRESHOLD_U: 3,
  RECENT_HYPO_WINDOW_MIN: 120, // 2 hours
  MAX_IOB_ADJUSTMENT_FACTOR: 0.5,
} as const;

// ============================================
// MEAL CONSTANTS
// ============================================

export const MEAL_CONSTANTS = {
  MAX_ITEMS_PER_MEAL: 20,
  MAX_QUANTITY_G: 2000,
  MIN_QUANTITY_G: 1,
  DEFAULT_SERVING_MULTIPLIER: 1.0,
  ABSORPTION_CURVE_DURATION_MIN: 240,
} as const;

// ============================================
// CGM CONSTANTS
// ============================================

export const CGM_CONSTANTS = {
  READING_INTERVAL_MIN: 5,
  MAX_BATCH_READINGS: 288,      // 24 hours
  MAX_GAP_MIN_FOR_INTERPOLATION: 15,
  TREND_ARROWS: {
    DOUBLE_UP: '↑↑',
    SINGLE_UP: '↑',
    STABLE: '→',
    SINGLE_DOWN: '↓',
    DOUBLE_DOWN: '↓↓',
  },
  TREND_VALUES: {
    DOUBLE_UP: 3,
    SINGLE_UP: 2,
    SLIGHT_UP: 1,
    STABLE: 0,
    SLIGHT_DOWN: -1,
    SINGLE_DOWN: -2,
    DOUBLE_DOWN: -3,
  },
} as const;

// ============================================
// INDIAN MEAL TYPES & REGIONS
// ============================================

export const INDIAN_MEAL_TYPES = [
  'south_indian_breakfast',
  'north_indian_lunch',
  'bengali_lunch',
  'gujarati_thali',
  'mughlai_dinner',
  'snack_fried',
  'fruit_snack',
  'default',
] as const;

export const INDIAN_REGIONS = [
  'north',
  'south',
  'east',
  'west',
  'central',
  'northeast',
  'pan_india',
] as const;

export const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
] as const;

// ============================================
// FOOD CATEGORIES (ICMR-NIN aligned)
// ============================================

export const FOOD_CATEGORIES = [
  'cereal',
  'pulse',
  'vegetable',
  'fruit',
  'dairy',
  'meat',
  'fish',
  'egg',
  'fat',
  'sweet',
  'beverage',
  'condiment',
  'composite',
  'supplement',
] as const;

// ============================================
// PREPARATION METHODS
// ============================================

export const PREP_METHODS = [
  'raw',
  'boiled',
  'steamed',
  'fried',
  'roasted',
  'baked',
  'pressure_cooked',
  'sauteed',
  'grilled',
  'raw_fermented',
] as const;

// ============================================
// ML MODEL CONSTANTS
// ============================================

export const ML_MODELS = {
  HYPO_PREDICTION: {
    NAME: 'tft_hypo_predictor',
    VERSION: '1.0.0',
    INPUT_FEATURES: 72,
    STATIC_FEATURES: 12,
    OUTPUT_QUANTILES: [0.1, 0.5, 0.9],
    HORIZONS: [30, 60],
  },
  CARB_ESTIMATION: {
    NAME: 'indian_food_carb_estimator',
    VERSION: '1.0.0',
    BACKBONE: 'efficientnet_b3',
    NUM_CLASSES: 256,
    INPUT_SIZE: 300,
  },
  INSULIN_DOSING: {
    NAME: 'indian_bolus_calculator',
    VERSION: '1.0.0',
  },
} as const;

// ============================================
// ERROR CODES
// ============================================

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  ML_INFERENCE_FAILED: 'ML_INFERENCE_FAILED',
  CGM_SYNC_FAILED: 'CGM_SYNC_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================
// HTTP STATUS CODES
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ============================================
// FEATURE FLAGS
// ============================================

export const FEATURE_FLAGS = {
  ENABLE_PHOTO_ML: true,
  ENABLE_VOICE_INPUT: true,
  ENABLE_OFFLINE_SYNC: true,
  ENABLE_CAREGIVER_MODE: true,
  ENABLE_CLINICAL_REPORTS: true,
  ENABLE_FEDERATED_LEARNING: false,
  ENABLE_SYNTHETIC_DATA: true,
  ENABLE_MODEL_EXPLANATIONS: true,
} as const;

// ============================================
// REGEX PATTERNS
// ============================================

export const PATTERNS = {
  PHONE_INDIA: /^(\+91|91|0)?[6-9]\d{9}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ISO_DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  BASE64_IMAGE: /^data:image\/(jpeg|png|webp);base64,/,
} as const;