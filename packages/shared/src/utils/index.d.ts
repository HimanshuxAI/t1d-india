/** Indian Standard Time zone */
export declare const IST_TIMEZONE = "Asia/Kolkata";
/** Format date to ISO string in IST */
export declare function toISTISO(date: Date): string;
/** Parse ISO string and return Date in IST */
export declare function fromISTISO(isoString: string): Date;
/** Get current time in IST */
export declare function nowIST(): Date;
/** Round timestamp to nearest 5-minute interval (for CGM alignment) */
export declare function roundTo5Min(date: Date): Date;
/** Generate 5-minute interval timestamps for a date range */
export declare function generate5MinIntervals(start: Date, end: Date): Date[];
/** Calculate minutes between two dates */
export declare function minutesBetween(start: Date, end: Date): number;
/** Check if date is valid */
export declare function isValidDate(date: unknown): date is Date;
/** Generate UUID v4 */
export declare function generateId(): string;
/** Generate short ID (8 chars) for client-facing identifiers */
export declare function generateShortId(): string;
export interface InsulinPKParams {
    ka: number;
    ke: number;
    tMax: number;
    bioavailability: number;
}
export declare const INSULIN_PK_PARAMS: Record<string, InsulinPKParams>;
/** Calculate Insulin On Board (IOB) using two-compartment model */
export declare function calculateIOB(doseU: number, minutesSinceInjection: number, insulinType: keyof typeof INSULIN_PK_PARAMS): number;
/** Calculate IOB for multiple injections */
export declare function calculateTotalIOB(injections: Array<{
    doseU: number;
    minutesAgo: number;
    type: keyof typeof INSULIN_PK_PARAMS;
}>): number;
export interface CarbAbsorptionPhase {
    name: 'rapid' | 'intermediate' | 'slow';
    fraction: number;
    kAbs: number;
    delayMin: number;
}
export declare const INDIAN_CARB_ABSORPTION: Record<string, CarbAbsorptionPhase[]>;
/** Generate carb absorption curve (g/min) for given meal */
export declare function generateAbsorptionCurve(totalCarbsG: number, mealType?: string, durationMin?: number): number[];
/** Get absorption profile for API response */
export declare function getAbsorptionProfile(totalCarbsG: number, mealType?: string): {
    phases: Array<{
        name: string;
        carbsG: number;
        kAbs: number;
        delayMin: number;
    }>;
};
/** Convert mmol/L to mg/dL */
export declare function mmolToMgDl(mmol: number): number;
/** Convert mg/dL to mmol/L */
export declare function mgDlToMmol(mgDl: number): number;
/** Convert grams to typical Indian serving units */
export declare function gramsToServings(grams: number, typicalServingG: number): number;
/** Validate glucose value (mg/dL) */
export declare function validateGlucose(value: number): boolean;
/** Validate insulin dose (U) */
export declare function validateInsulinDose(value: number): boolean;
/** Validate carb amount (g) */
export declare function validateCarbs(value: number): boolean;
/** Validate ICR (g/U) */
export declare function validateICR(value: number): boolean;
/** Validate ISF (mg/dL/U) */
export declare function validateISF(value: number): boolean;
/** Format glucose for display */
export declare function formatGlucose(mgDl: number, showUnit?: boolean): string;
/** Format insulin dose for display */
export declare function formatInsulinDose(units: number): string;
/** Format carbs for display */
export declare function formatCarbs(grams: number): string;
/** Format time ago (e.g., "5 min ago", "2 hr ago") */
export declare function formatTimeAgo(date: Date): string;
/** Common Indian reference objects for portion estimation */
export declare const INDIAN_REFERENCE_OBJECTS: {
    readonly katori: {
        readonly name: "katori";
        readonly volumeMl: 150;
        readonly weightG: 150;
    };
    readonly smallKatori: {
        readonly name: "small katori";
        readonly volumeMl: 100;
        readonly weightG: 100;
    };
    readonly chapati: {
        readonly name: "chapati";
        readonly weightG: 30;
    };
    readonly smallChapati: {
        readonly name: "small chapati";
        readonly weightG: 20;
    };
    readonly largeChapati: {
        readonly name: "large chapati";
        readonly weightG: 40;
    };
    readonly tablespoon: {
        readonly name: "tablespoon";
        readonly volumeMl: 15;
        readonly weightG: 15;
    };
    readonly teaspoon: {
        readonly name: "teaspoon";
        readonly volumeMl: 5;
        readonly weightG: 5;
    };
    readonly ladle: {
        readonly name: "ladle";
        readonly volumeMl: 60;
        readonly weightG: 60;
    };
    readonly glass: {
        readonly name: "glass";
        readonly volumeMl: 200;
        readonly weightG: 200;
    };
    readonly smallGlass: {
        readonly name: "small glass";
        readonly volumeMl: 150;
        readonly weightG: 150;
    };
};
/** Estimate portion from reference object */
export declare function estimatePortionFromReference(referenceKey: keyof typeof INDIAN_REFERENCE_OBJECTS, count?: number): number;
/** Get meal type from time of day (Indian context) */
export declare function getMealTypeFromTime(date: Date): 'breakfast' | 'lunch' | 'dinner' | 'snack';
//# sourceMappingURL=index.d.ts.map