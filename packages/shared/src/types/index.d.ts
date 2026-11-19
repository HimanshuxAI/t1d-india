import { z } from 'zod';
export declare enum UserRole {
    PATIENT = "PATIENT",
    CAREGIVER = "CAREGIVER",
    CLINICIAN = "CLINICIAN",
    ADMIN = "ADMIN"
}
export declare enum DiabetesType {
    T1D = "T1D",
    T2D = "T2D",
    LADA = "LADA",
    MODY = "MODY",
    OTHER = "OTHER"
}
export declare enum InsulinRegimen {
    BASAL_BOLUS = "BASAL_BOLUS",
    NPH_REGULAR = "NPH_REGULAR",
    PREMIXED_30_70 = "PREMIXED_30_70",
    PREMIXED_50_50 = "PREMIXED_50_50",
    PUMP = "PUMP",
    OTHER = "OTHER"
}
export declare enum CGMType {
    DEXCOM_G6 = "DEXCOM_G6",
    DEXCOM_G7 = "DEXCOM_G7",
    LIBRE_2 = "LIBRE_2",
    LIBRE_3 = "LIBRE_3",
    MEDTRONIC_G3 = "MEDTRONIC_G3",
    MEDTRONIC_G4 = "MEDTRONIC_G4",
    NONE = "NONE"
}
export declare enum MealType {
    BREAKFAST = "BREAKFAST",
    LUNCH = "LUNCH",
    DINNER = "DINNER",
    SNACK = "SNACK",
    PRE_WORKOUT = "PRE_WORKOUT",
    POST_WORKOUT = "POST_WORKOUT",
    BEDTIME = "BEDTIME"
}
export declare enum InputMethod {
    TEXT_SEARCH = "TEXT_SEARCH",
    VOICE = "VOICE",
    PHOTO_OCR = "PHOTO_OCR",
    PHOTO_ML = "PHOTO_ML",
    BARCODE = "BARCODE",
    COMPOSITE_SELECT = "COMPOSITE_SELECT",
    MANUAL = "MANUAL"
}
export declare enum LocationType {
    HOME = "HOME",
    WORK = "WORK",
    SCHOOL = "SCHOOL",
    RESTAURANT = "RESTAURANT",
    TRAVEL = "TRAVEL",
    OTHER = "OTHER"
}
export declare enum InsulinType {
    RAPID_LISPRO = "RAPID_LISPRO",
    RAPID_ASPART = "RAPID_ASPART",
    RAPID_GLULISINE = "RAPID_GLULISINE",
    REGULAR_HUMAN = "REGULAR_HUMAN",
    NPH_HUMAN = "NPH_HUMAN",
    PREMIXED_30_70 = "PREMIXED_30_70",
    PREMIXED_50_50 = "PREMIXED_50_50",
    PREMIXED_25_75 = "PREMIXED_25_75",
    GLARGINE_U100 = "GLARGINE_U100",
    GLARGINE_U300 = "GLARGINE_U300",
    DEGLUDEC_U100 = "DEGLUDEC_U100",
    DEGLUDEC_U200 = "DEGLUDEC_U200",
    BASAL_PUMP = "BASAL_PUMP"
}
export declare enum InjectionSite {
    ABDOMEN = "ABDOMEN",
    THIGH = "THIGH",
    ARM = "ARM",
    BUTTOCK = "BUTTOCK",
    PUMP_SITE = "PUMP_SITE"
}
export declare enum DeliveryMethod {
    PEN = "PEN",
    SYRINGE = "SYRINGE",
    PUMP = "PUMP",
    INHALER = "INHALER"
}
export declare enum AlertLevel {
    WARNING = "WARNING",
    URGENT = "URGENT",
    EMERGENCY = "EMERGENCY"
}
export declare enum CGMSource {
    DEXCOM_API = "DEXCOM_API",
    LIBRE_API = "LIBRE_API",
    MEDTRONIC_API = "MEDTRONIC_API",
    BLUETOOTH = "BLUETOOTH",
    MANUAL = "MANUAL",
    SIMULATED = "SIMULATED"
}
export declare const MealItemSchema: z.ZodObject<{
    foodId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    quantityG: z.ZodNumber;
    prepMethod: z.ZodDefault<z.ZodEnum<["raw", "boiled", "steamed", "fried", "roasted", "baked", "pressure_cooked", "sauteed"]>>;
    carbsOverrideG: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    quantityG: number;
    prepMethod: "raw" | "boiled" | "steamed" | "fried" | "roasted" | "baked" | "pressure_cooked" | "sauteed";
    foodId?: string | undefined;
    carbsOverrideG?: number | undefined;
}, {
    name: string;
    quantityG: number;
    foodId?: string | undefined;
    prepMethod?: "raw" | "boiled" | "steamed" | "fried" | "roasted" | "baked" | "pressure_cooked" | "sauteed" | undefined;
    carbsOverrideG?: number | undefined;
}>;
export type MealItem = z.infer<typeof MealItemSchema>;
export declare const AbsorptionPhaseSchema: z.ZodObject<{
    name: z.ZodEnum<["rapid", "intermediate", "slow"]>;
    carbsG: z.ZodNumber;
    kAbs: z.ZodNumber;
    delayMin: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: "rapid" | "intermediate" | "slow";
    carbsG: number;
    kAbs: number;
    delayMin: number;
}, {
    name: "rapid" | "intermediate" | "slow";
    carbsG: number;
    kAbs: number;
    delayMin: number;
}>;
export type AbsorptionPhase = z.infer<typeof AbsorptionPhaseSchema>;
export declare const AbsorptionProfileSchema: z.ZodObject<{
    phases: z.ZodArray<z.ZodObject<{
        name: z.ZodEnum<["rapid", "intermediate", "slow"]>;
        carbsG: z.ZodNumber;
        kAbs: z.ZodNumber;
        delayMin: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: "rapid" | "intermediate" | "slow";
        carbsG: number;
        kAbs: number;
        delayMin: number;
    }, {
        name: "rapid" | "intermediate" | "slow";
        carbsG: number;
        kAbs: number;
        delayMin: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    phases: {
        name: "rapid" | "intermediate" | "slow";
        carbsG: number;
        kAbs: number;
        delayMin: number;
    }[];
}, {
    phases: {
        name: "rapid" | "intermediate" | "slow";
        carbsG: number;
        kAbs: number;
        delayMin: number;
    }[];
}>;
export type AbsorptionProfile = z.infer<typeof AbsorptionProfileSchema>;
export declare const IndianCarbOptionSchema: z.ZodObject<{
    item: z.ZodString;
    quantity: z.ZodString;
    carbsG: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    carbsG: number;
    item: string;
    quantity: string;
}, {
    carbsG: number;
    item: string;
    quantity: string;
}>;
export type IndianCarbOption = z.infer<typeof IndianCarbOptionSchema>;
export declare const CreateMealLogSchema: z.ZodObject<{
    mealTime: z.ZodString;
    mealType: z.ZodNativeEnum<typeof MealType>;
    items: z.ZodArray<z.ZodObject<{
        foodId: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        quantityG: z.ZodNumber;
        prepMethod: z.ZodDefault<z.ZodEnum<["raw", "boiled", "steamed", "fried", "roasted", "baked", "pressure_cooked", "sauteed"]>>;
        carbsOverrideG: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        quantityG: number;
        prepMethod: "raw" | "boiled" | "steamed" | "fried" | "roasted" | "baked" | "pressure_cooked" | "sauteed";
        foodId?: string | undefined;
        carbsOverrideG?: number | undefined;
    }, {
        name: string;
        quantityG: number;
        foodId?: string | undefined;
        prepMethod?: "raw" | "boiled" | "steamed" | "fried" | "roasted" | "baked" | "pressure_cooked" | "sauteed" | undefined;
        carbsOverrideG?: number | undefined;
    }>, "many">;
    inputMethod: z.ZodNativeEnum<typeof InputMethod>;
    locationType: z.ZodOptional<z.ZodNativeEnum<typeof LocationType>>;
    hungerLevel: z.ZodOptional<z.ZodNumber>;
    moodTag: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mealTime: string;
    mealType: MealType;
    items: {
        name: string;
        quantityG: number;
        prepMethod: "raw" | "boiled" | "steamed" | "fried" | "roasted" | "baked" | "pressure_cooked" | "sauteed";
        foodId?: string | undefined;
        carbsOverrideG?: number | undefined;
    }[];
    inputMethod: InputMethod;
    locationType?: LocationType | undefined;
    hungerLevel?: number | undefined;
    moodTag?: string | undefined;
    notes?: string | undefined;
}, {
    mealTime: string;
    mealType: MealType;
    items: {
        name: string;
        quantityG: number;
        foodId?: string | undefined;
        prepMethod?: "raw" | "boiled" | "steamed" | "fried" | "roasted" | "baked" | "pressure_cooked" | "sauteed" | undefined;
        carbsOverrideG?: number | undefined;
    }[];
    inputMethod: InputMethod;
    locationType?: LocationType | undefined;
    hungerLevel?: number | undefined;
    moodTag?: string | undefined;
    notes?: string | undefined;
}>;
export type CreateMealLogInput = z.infer<typeof CreateMealLogSchema>;
export declare const MealLogResponseSchema: z.ZodObject<{
    id: z.ZodString;
    totalCarbsG: z.ZodNumber;
    totalProteinG: z.ZodOptional<z.ZodNumber>;
    totalFatG: z.ZodOptional<z.ZodNumber>;
    totalFiberG: z.ZodOptional<z.ZodNumber>;
    absorptionProfile: z.ZodOptional<z.ZodObject<{
        phases: z.ZodArray<z.ZodObject<{
            name: z.ZodEnum<["rapid", "intermediate", "slow"]>;
            carbsG: z.ZodNumber;
            kAbs: z.ZodNumber;
            delayMin: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: "rapid" | "intermediate" | "slow";
            carbsG: number;
            kAbs: number;
            delayMin: number;
        }, {
            name: "rapid" | "intermediate" | "slow";
            carbsG: number;
            kAbs: number;
            delayMin: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        phases: {
            name: "rapid" | "intermediate" | "slow";
            carbsG: number;
            kAbs: number;
            delayMin: number;
        }[];
    }, {
        phases: {
            name: "rapid" | "intermediate" | "slow";
            carbsG: number;
            kAbs: number;
            delayMin: number;
        }[];
    }>>;
    loggedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    totalCarbsG: number;
    loggedAt: string;
    totalProteinG?: number | undefined;
    totalFatG?: number | undefined;
    totalFiberG?: number | undefined;
    absorptionProfile?: {
        phases: {
            name: "rapid" | "intermediate" | "slow";
            carbsG: number;
            kAbs: number;
            delayMin: number;
        }[];
    } | undefined;
}, {
    id: string;
    totalCarbsG: number;
    loggedAt: string;
    totalProteinG?: number | undefined;
    totalFatG?: number | undefined;
    totalFiberG?: number | undefined;
    absorptionProfile?: {
        phases: {
            name: "rapid" | "intermediate" | "slow";
            carbsG: number;
            kAbs: number;
            delayMin: number;
        }[];
    } | undefined;
}>;
export type MealLogResponse = z.infer<typeof MealLogResponseSchema>;
export declare const FoodSearchParamsSchema: z.ZodObject<{
    q: z.ZodString;
    locale: z.ZodDefault<z.ZodEnum<["en", "hi", "ta", "te", "mr", "gu", "bn"]>>;
    category: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    q: string;
    locale: "en" | "hi" | "ta" | "te" | "mr" | "gu" | "bn";
    limit: number;
    category?: string | undefined;
    region?: string | undefined;
}, {
    q: string;
    locale?: "en" | "hi" | "ta" | "te" | "mr" | "gu" | "bn" | undefined;
    category?: string | undefined;
    region?: string | undefined;
    limit?: number | undefined;
}>;
export type FoodSearchParams = z.infer<typeof FoodSearchParamsSchema>;
export declare const FoodSearchResultSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    nameLocalized: z.ZodString;
    category: z.ZodString;
    carbsPer100g: z.ZodNumber;
    typicalServingG: z.ZodOptional<z.ZodNumber>;
    servingDescription: z.ZodOptional<z.ZodString>;
    confidenceScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    category: string;
    nameLocalized: string;
    carbsPer100g: number;
    confidenceScore: number;
    typicalServingG?: number | undefined;
    servingDescription?: string | undefined;
}, {
    name: string;
    id: string;
    category: string;
    nameLocalized: string;
    carbsPer100g: number;
    confidenceScore: number;
    typicalServingG?: number | undefined;
    servingDescription?: string | undefined;
}>;
export type FoodSearchResult = z.infer<typeof FoodSearchResultSchema>;
export declare const CGMReadingInputSchema: z.ZodObject<{
    time: z.ZodString;
    glucoseMgDl: z.ZodNumber;
    trend: z.ZodOptional<z.ZodNumber>;
    trendArrow: z.ZodOptional<z.ZodString>;
    source: z.ZodNativeEnum<typeof CGMSource>;
    deviceTimestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    time: string;
    glucoseMgDl: number;
    source: CGMSource;
    trend?: number | undefined;
    trendArrow?: string | undefined;
    deviceTimestamp?: string | undefined;
}, {
    time: string;
    glucoseMgDl: number;
    source: CGMSource;
    trend?: number | undefined;
    trendArrow?: string | undefined;
    deviceTimestamp?: string | undefined;
}>;
export declare const CGMBatchUploadSchema: z.ZodObject<{
    readings: z.ZodArray<z.ZodObject<{
        time: z.ZodString;
        glucoseMgDl: z.ZodNumber;
        trend: z.ZodOptional<z.ZodNumber>;
        trendArrow: z.ZodOptional<z.ZodString>;
        source: z.ZodNativeEnum<typeof CGMSource>;
        deviceTimestamp: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        time: string;
        glucoseMgDl: number;
        source: CGMSource;
        trend?: number | undefined;
        trendArrow?: string | undefined;
        deviceTimestamp?: string | undefined;
    }, {
        time: string;
        glucoseMgDl: number;
        source: CGMSource;
        trend?: number | undefined;
        trendArrow?: string | undefined;
        deviceTimestamp?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    readings: {
        time: string;
        glucoseMgDl: number;
        source: CGMSource;
        trend?: number | undefined;
        trendArrow?: string | undefined;
        deviceTimestamp?: string | undefined;
    }[];
}, {
    readings: {
        time: string;
        glucoseMgDl: number;
        source: CGMSource;
        trend?: number | undefined;
        trendArrow?: string | undefined;
        deviceTimestamp?: string | undefined;
    }[];
}>;
export type CGMBatchUploadInput = z.infer<typeof CGMBatchUploadSchema>;
export declare const CGMBatchUploadResponseSchema: z.ZodObject<{
    accepted: z.ZodNumber;
    rejected: z.ZodNumber;
    errors: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        code: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        index: number;
    }, {
        message: string;
        code: string;
        index: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    accepted: number;
    rejected: number;
    errors: {
        message: string;
        code: string;
        index: number;
    }[];
}, {
    accepted: number;
    rejected: number;
    errors: {
        message: string;
        code: string;
        index: number;
    }[];
}>;
export type CGMBatchUploadResponse = z.infer<typeof CGMBatchUploadResponseSchema>;
export declare const HypoPredictionResponseSchema: z.ZodObject<{
    predictions: z.ZodArray<z.ZodObject<{
        horizonMin: z.ZodNumber;
        glucoseP10: z.ZodNumber;
        glucoseP50: z.ZodNumber;
        glucoseP90: z.ZodNumber;
        hypoProbability: z.ZodNumber;
        severeHypoProbability: z.ZodNumber;
        topFeatures: z.ZodArray<z.ZodObject<{
            feature: z.ZodString;
            contribution: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            feature: string;
            contribution: number;
        }, {
            feature: string;
            contribution: number;
        }>, "many">;
        predictedAt: z.ZodString;
        modelVersion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        horizonMin: number;
        glucoseP10: number;
        glucoseP50: number;
        glucoseP90: number;
        hypoProbability: number;
        severeHypoProbability: number;
        topFeatures: {
            feature: string;
            contribution: number;
        }[];
        predictedAt: string;
        modelVersion: string;
    }, {
        horizonMin: number;
        glucoseP10: number;
        glucoseP50: number;
        glucoseP90: number;
        hypoProbability: number;
        severeHypoProbability: number;
        topFeatures: {
            feature: string;
            contribution: number;
        }[];
        predictedAt: string;
        modelVersion: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    predictions: {
        horizonMin: number;
        glucoseP10: number;
        glucoseP50: number;
        glucoseP90: number;
        hypoProbability: number;
        severeHypoProbability: number;
        topFeatures: {
            feature: string;
            contribution: number;
        }[];
        predictedAt: string;
        modelVersion: string;
    }[];
}, {
    predictions: {
        horizonMin: number;
        glucoseP10: number;
        glucoseP50: number;
        glucoseP90: number;
        hypoProbability: number;
        severeHypoProbability: number;
        topFeatures: {
            feature: string;
            contribution: number;
        }[];
        predictedAt: string;
        modelVersion: string;
    }[];
}>;
export type HypoPredictionResponse = z.infer<typeof HypoPredictionResponseSchema>;
export declare const BolusCalculationRequestSchema: z.ZodObject<{
    carbsG: z.ZodNumber;
    currentGlucoseMgDl: z.ZodNumber;
    mealType: z.ZodOptional<z.ZodNativeEnum<typeof MealType>>;
    icrGPerU: z.ZodOptional<z.ZodNumber>;
    isfMgDlPerU: z.ZodOptional<z.ZodNumber>;
    regimen: z.ZodOptional<z.ZodNativeEnum<typeof InsulinRegimen>>;
}, "strip", z.ZodTypeAny, {
    carbsG: number;
    currentGlucoseMgDl: number;
    mealType?: MealType | undefined;
    icrGPerU?: number | undefined;
    isfMgDlPerU?: number | undefined;
    regimen?: InsulinRegimen | undefined;
}, {
    carbsG: number;
    currentGlucoseMgDl: number;
    mealType?: MealType | undefined;
    icrGPerU?: number | undefined;
    isfMgDlPerU?: number | undefined;
    regimen?: InsulinRegimen | undefined;
}>;
export type BolusCalculationRequest = z.infer<typeof BolusCalculationRequestSchema>;
export declare const BolusCalculationResponseSchema: z.ZodObject<{
    mealBolusU: z.ZodNumber;
    correctionBolusU: z.ZodNumber;
    totalBolusU: z.ZodNumber;
    maxAllowedU: z.ZodNumber;
    warnings: z.ZodArray<z.ZodString, "many">;
    explanation: z.ZodString;
    safetyCheck: z.ZodObject<{
        predictedMinGlucose: z.ZodNumber;
        iobTotalU: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        predictedMinGlucose: number;
        iobTotalU: number;
    }, {
        predictedMinGlucose: number;
        iobTotalU: number;
    }>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export type BolusCalculationResponse = z.infer<typeof BolusCalculationResponseSchema>;
export declare const CreateInsulinLogSchema: z.ZodObject<{
    administeredAt: z.ZodString;
    insulinType: z.ZodNativeEnum<typeof InsulinType>;
    doseU: z.ZodNumber;
    injectionSite: z.ZodNativeEnum<typeof InjectionSite>;
    relatedMealLogId: z.ZodOptional<z.ZodString>;
    glucoseAtInjection: z.ZodOptional<z.ZodNumber>;
    carbEstimateG: z.ZodOptional<z.ZodNumber>;
    calculatorRecommendedU: z.ZodOptional<z.ZodNumber>;
    overrideReason: z.ZodOptional<z.ZodString>;
    deliveryMethod: z.ZodNativeEnum<typeof DeliveryMethod>;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    administeredAt: string;
    insulinType: InsulinType;
    doseU: number;
    injectionSite: InjectionSite;
    deliveryMethod: DeliveryMethod;
    relatedMealLogId?: string | undefined;
    glucoseAtInjection?: number | undefined;
    carbEstimateG?: number | undefined;
    calculatorRecommendedU?: number | undefined;
    overrideReason?: string | undefined;
    deviceId?: string | undefined;
}, {
    administeredAt: string;
    insulinType: InsulinType;
    doseU: number;
    injectionSite: InjectionSite;
    deliveryMethod: DeliveryMethod;
    relatedMealLogId?: string | undefined;
    glucoseAtInjection?: number | undefined;
    carbEstimateG?: number | undefined;
    calculatorRecommendedU?: number | undefined;
    overrideReason?: string | undefined;
    deviceId?: string | undefined;
}>;
export type CreateInsulinLogInput = z.infer<typeof CreateInsulinLogSchema>;
export declare const PatientProfileSchema: z.ZodObject<{
    dateOfBirth: z.ZodString;
    gender: z.ZodEnum<["male", "female", "other"]>;
    heightCm: z.ZodOptional<z.ZodNumber>;
    weightKg: z.ZodOptional<z.ZodNumber>;
    diabetesType: z.ZodNativeEnum<typeof DiabetesType>;
    diagnosisDate: z.ZodOptional<z.ZodString>;
    hba1cLatest: z.ZodOptional<z.ZodNumber>;
    insulinRegimen: z.ZodNativeEnum<typeof InsulinRegimen>;
    icrGPerU: z.ZodOptional<z.ZodNumber>;
    isfMgDlPerU: z.ZodOptional<z.ZodNumber>;
    targetGlucoseMgDl: z.ZodDefault<z.ZodNumber>;
    basalRateUPerHr: z.ZodOptional<z.ZodNumber>;
    nphMorningU: z.ZodOptional<z.ZodNumber>;
    nphEveningU: z.ZodOptional<z.ZodNumber>;
    regularBreakfastU: z.ZodOptional<z.ZodNumber>;
    regularLunchU: z.ZodOptional<z.ZodNumber>;
    regularDinnerU: z.ZodOptional<z.ZodNumber>;
    cgmType: z.ZodOptional<z.ZodNativeEnum<typeof CGMType>>;
    cgmSerialHash: z.ZodOptional<z.ZodString>;
    pumpType: z.ZodOptional<z.ZodString>;
    hypoThresholdMgDl: z.ZodDefault<z.ZodNumber>;
    severeHypoThresholdMgDl: z.ZodDefault<z.ZodNumber>;
    alertSoundEnabled: z.ZodDefault<z.ZodBoolean>;
    caregiverShareEnabled: z.ZodDefault<z.ZodBoolean>;
    dataSharingConsent: z.ZodDefault<z.ZodBoolean>;
    researchConsent: z.ZodDefault<z.ZodBoolean>;
    marketingConsent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dateOfBirth: string;
    gender: "other" | "male" | "female";
    diabetesType: DiabetesType;
    insulinRegimen: InsulinRegimen;
    targetGlucoseMgDl: number;
    hypoThresholdMgDl: number;
    severeHypoThresholdMgDl: number;
    alertSoundEnabled: boolean;
    caregiverShareEnabled: boolean;
    dataSharingConsent: boolean;
    researchConsent: boolean;
    marketingConsent: boolean;
    icrGPerU?: number | undefined;
    isfMgDlPerU?: number | undefined;
    heightCm?: number | undefined;
    weightKg?: number | undefined;
    diagnosisDate?: string | undefined;
    hba1cLatest?: number | undefined;
    basalRateUPerHr?: number | undefined;
    nphMorningU?: number | undefined;
    nphEveningU?: number | undefined;
    regularBreakfastU?: number | undefined;
    regularLunchU?: number | undefined;
    regularDinnerU?: number | undefined;
    cgmType?: CGMType | undefined;
    cgmSerialHash?: string | undefined;
    pumpType?: string | undefined;
}, {
    dateOfBirth: string;
    gender: "other" | "male" | "female";
    diabetesType: DiabetesType;
    insulinRegimen: InsulinRegimen;
    icrGPerU?: number | undefined;
    isfMgDlPerU?: number | undefined;
    heightCm?: number | undefined;
    weightKg?: number | undefined;
    diagnosisDate?: string | undefined;
    hba1cLatest?: number | undefined;
    targetGlucoseMgDl?: number | undefined;
    basalRateUPerHr?: number | undefined;
    nphMorningU?: number | undefined;
    nphEveningU?: number | undefined;
    regularBreakfastU?: number | undefined;
    regularLunchU?: number | undefined;
    regularDinnerU?: number | undefined;
    cgmType?: CGMType | undefined;
    cgmSerialHash?: string | undefined;
    pumpType?: string | undefined;
    hypoThresholdMgDl?: number | undefined;
    severeHypoThresholdMgDl?: number | undefined;
    alertSoundEnabled?: boolean | undefined;
    caregiverShareEnabled?: boolean | undefined;
    dataSharingConsent?: boolean | undefined;
    researchConsent?: boolean | undefined;
    marketingConsent?: boolean | undefined;
}>;
export type PatientProfileInput = z.infer<typeof PatientProfileSchema>;
export interface HypoPredictionInput {
    glucose: number[];
    roc: number[];
    iobRapid: number[];
    ioBRegular: number[];
    iobNph: number[];
    carbsAbsorbing: number[];
    steps5min: number[];
    hr: number[];
    age: number;
    weight: number;
    diabetesDurationYears: number;
    isf: number;
    icr: number;
    regimenType: number;
    hypoUnawareness: number;
}
export interface HypoPredictionOutput {
    glucoseP10: number;
    glucoseP50: number;
    glucoseP90: number;
    hypoProbability30min: number;
    hypoProbability60min: number;
    severeHypoProbability30min: number;
    topFeatures: Array<{
        feature: string;
        contribution: number;
    }>;
}
export interface CarbEstimationInput {
    imageBase64: string;
    mealTypeHint?: string;
}
export interface CarbEstimationOutput {
    foodClass: string;
    foodClassConfidence: number;
    portionG: number;
    carbsG: number;
    carbsConfidence: number;
    attentionMap?: string;
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
export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, statusCode?: number, details?: Record<string, unknown> | undefined);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
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
export declare const PaginationParamsSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    limit?: number | undefined;
    page?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type PaginationParamsInput = z.infer<typeof PaginationParamsSchema>;
//# sourceMappingURL=index.d.ts.map