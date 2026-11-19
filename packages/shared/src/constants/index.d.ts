export declare const APP_NAME = "T1D India";
export declare const APP_VERSION = "0.0.1";
export declare const API_PREFIX = "/api/v1";
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const DEFAULT_PAGE = 1;
export declare const RATE_LIMIT_WINDOW_MS = 60000;
export declare const RATE_LIMIT_MAX_REQUESTS = 100;
export declare const RATE_LIMIT_AUTH_MAX = 10;
export declare const CACHE_TTL: {
    readonly FOOD_SEARCH: 3600;
    readonly FOOD_DETAIL: 86400;
    readonly COMPOSITE_MEAL: 86400;
    readonly USER_PROFILE: 300;
    readonly CGM_LATEST: 30;
    readonly HYPO_PREDICTION: 60;
    readonly ML_MODEL_METADATA: 3600;
};
export declare const GLUCOSE_THRESHOLDS: {
    readonly VERY_LOW: 54;
    readonly LOW: 70;
    readonly TARGET_LOW: 70;
    readonly TARGET_HIGH: 180;
    readonly HIGH: 180;
    readonly VERY_HIGH: 250;
    readonly CRITICAL_LOW: 40;
    readonly CRITICAL_HIGH: 400;
};
export declare const HYPO_PREDICTION: {
    readonly HORIZONS_MIN: readonly [30, 60];
    readonly DEFAULT_HORIZON_MIN: 30;
    readonly SENSITIVITY_TARGET: 0.91;
    readonly SPECIFICITY_TARGET: 0.9;
    readonly MODEL_INPUT_WINDOW_MIN: 30;
    readonly MODEL_STEP_MIN: 5;
    readonly MODEL_STEPS: 6;
    readonly ALERT_COOLDOWN_MIN: 15;
    readonly MAX_ALERTS_PER_HOUR: 4;
};
export declare const INSULIN_SAFETY: {
    readonly MAX_BOLUS_U: 15;
    readonly MAX_CORRECTION_U: 5;
    readonly MIN_GLUCOSE_FOR_CORRECTION: 90;
    readonly TARGET_GLUCOSE: 110;
    readonly MIN_PREDICTED_GLUCOSE: 70;
    readonly IOB_HIGH_THRESHOLD_U: 3;
    readonly RECENT_HYPO_WINDOW_MIN: 120;
    readonly MAX_IOB_ADJUSTMENT_FACTOR: 0.5;
};
export declare const MEAL_CONSTANTS: {
    readonly MAX_ITEMS_PER_MEAL: 20;
    readonly MAX_QUANTITY_G: 2000;
    readonly MIN_QUANTITY_G: 1;
    readonly DEFAULT_SERVING_MULTIPLIER: 1;
    readonly ABSORPTION_CURVE_DURATION_MIN: 240;
};
export declare const CGM_CONSTANTS: {
    readonly READING_INTERVAL_MIN: 5;
    readonly MAX_BATCH_READINGS: 288;
    readonly MAX_GAP_MIN_FOR_INTERPOLATION: 15;
    readonly TREND_ARROWS: {
        readonly DOUBLE_UP: "↑↑";
        readonly SINGLE_UP: "↑";
        readonly STABLE: "→";
        readonly SINGLE_DOWN: "↓";
        readonly DOUBLE_DOWN: "↓↓";
    };
    readonly TREND_VALUES: {
        readonly DOUBLE_UP: 3;
        readonly SINGLE_UP: 2;
        readonly SLIGHT_UP: 1;
        readonly STABLE: 0;
        readonly SLIGHT_DOWN: -1;
        readonly SINGLE_DOWN: -2;
        readonly DOUBLE_DOWN: -3;
    };
};
export declare const INDIAN_MEAL_TYPES: readonly ["south_indian_breakfast", "north_indian_lunch", "bengali_lunch", "gujarati_thali", "mughlai_dinner", "snack_fried", "fruit_snack", "default"];
export declare const INDIAN_REGIONS: readonly ["north", "south", "east", "west", "central", "northeast", "pan_india"];
export declare const INDIAN_LANGUAGES: readonly [{
    readonly code: "en";
    readonly name: "English";
    readonly nativeName: "English";
}, {
    readonly code: "hi";
    readonly name: "Hindi";
    readonly nativeName: "हिन्दी";
}, {
    readonly code: "ta";
    readonly name: "Tamil";
    readonly nativeName: "தமிழ்";
}, {
    readonly code: "te";
    readonly name: "Telugu";
    readonly nativeName: "తెలుగు";
}, {
    readonly code: "mr";
    readonly name: "Marathi";
    readonly nativeName: "मराठी";
}, {
    readonly code: "gu";
    readonly name: "Gujarati";
    readonly nativeName: "ગુજરાતી";
}, {
    readonly code: "bn";
    readonly name: "Bengali";
    readonly nativeName: "বাংলা";
}, {
    readonly code: "pa";
    readonly name: "Punjabi";
    readonly nativeName: "ਪੰਜਾਬੀ";
}, {
    readonly code: "kn";
    readonly name: "Kannada";
    readonly nativeName: "ಕನ್ನಡ";
}, {
    readonly code: "ml";
    readonly name: "Malayalam";
    readonly nativeName: "മലയാളം";
}];
export declare const FOOD_CATEGORIES: readonly ["cereal", "pulse", "vegetable", "fruit", "dairy", "meat", "fish", "egg", "fat", "sweet", "beverage", "condiment", "composite", "supplement"];
export declare const PREP_METHODS: readonly ["raw", "boiled", "steamed", "fried", "roasted", "baked", "pressure_cooked", "sauteed", "grilled", "raw_fermented"];
export declare const ML_MODELS: {
    readonly HYPO_PREDICTION: {
        readonly NAME: "tft_hypo_predictor";
        readonly VERSION: "1.0.0";
        readonly INPUT_FEATURES: 72;
        readonly STATIC_FEATURES: 12;
        readonly OUTPUT_QUANTILES: readonly [0.1, 0.5, 0.9];
        readonly HORIZONS: readonly [30, 60];
    };
    readonly CARB_ESTIMATION: {
        readonly NAME: "indian_food_carb_estimator";
        readonly VERSION: "1.0.0";
        readonly BACKBONE: "efficientnet_b3";
        readonly NUM_CLASSES: 256;
        readonly INPUT_SIZE: 300;
    };
    readonly INSULIN_DOSING: {
        readonly NAME: "indian_bolus_calculator";
        readonly VERSION: "1.0.0";
    };
};
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly CONFLICT: "CONFLICT";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly ML_INFERENCE_FAILED: "ML_INFERENCE_FAILED";
    readonly CGM_SYNC_FAILED: "CGM_SYNC_FAILED";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly ACCEPTED: 202;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
    readonly GATEWAY_TIMEOUT: 504;
};
export declare const FEATURE_FLAGS: {
    readonly ENABLE_PHOTO_ML: true;
    readonly ENABLE_VOICE_INPUT: true;
    readonly ENABLE_OFFLINE_SYNC: true;
    readonly ENABLE_CAREGIVER_MODE: true;
    readonly ENABLE_CLINICAL_REPORTS: true;
    readonly ENABLE_FEDERATED_LEARNING: false;
    readonly ENABLE_SYNTHETIC_DATA: true;
    readonly ENABLE_MODEL_EXPLANATIONS: true;
};
export declare const PATTERNS: {
    readonly PHONE_INDIA: RegExp;
    readonly EMAIL: RegExp;
    readonly UUID: RegExp;
    readonly ISO_DATETIME: RegExp;
    readonly BASE64_IMAGE: RegExp;
};
//# sourceMappingURL=index.d.ts.map