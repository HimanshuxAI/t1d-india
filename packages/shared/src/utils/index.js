"use strict";
// Shared Utility Functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDIAN_REFERENCE_OBJECTS = exports.INDIAN_CARB_ABSORPTION = exports.INSULIN_PK_PARAMS = exports.IST_TIMEZONE = void 0;
exports.toISTISO = toISTISO;
exports.fromISTISO = fromISTISO;
exports.nowIST = nowIST;
exports.roundTo5Min = roundTo5Min;
exports.generate5MinIntervals = generate5MinIntervals;
exports.minutesBetween = minutesBetween;
exports.isValidDate = isValidDate;
exports.generateId = generateId;
exports.generateShortId = generateShortId;
exports.calculateIOB = calculateIOB;
exports.calculateTotalIOB = calculateTotalIOB;
exports.generateAbsorptionCurve = generateAbsorptionCurve;
exports.getAbsorptionProfile = getAbsorptionProfile;
exports.mmolToMgDl = mmolToMgDl;
exports.mgDlToMmol = mgDlToMmol;
exports.gramsToServings = gramsToServings;
exports.validateGlucose = validateGlucose;
exports.validateInsulinDose = validateInsulinDose;
exports.validateCarbs = validateCarbs;
exports.validateICR = validateICR;
exports.validateISF = validateISF;
exports.formatGlucose = formatGlucose;
exports.formatInsulinDose = formatInsulinDose;
exports.formatCarbs = formatCarbs;
exports.formatTimeAgo = formatTimeAgo;
exports.estimatePortionFromReference = estimatePortionFromReference;
exports.getMealTypeFromTime = getMealTypeFromTime;
const date_fns_1 = require("date-fns");
const uuid_1 = require("uuid");
// ============================================
// DATE/TIME UTILITIES
// ============================================
/** Indian Standard Time zone */
exports.IST_TIMEZONE = 'Asia/Kolkata';
/** Format date to ISO string in IST */
function toISTISO(date) {
    return (0, date_fns_1.format)(date, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: exports.IST_TIMEZONE });
}
/** Parse ISO string and return Date in IST */
function fromISTISO(isoString) {
    return (0, date_fns_1.parseISO)(isoString);
}
/** Get current time in IST */
function nowIST() {
    return new Date();
}
/** Round timestamp to nearest 5-minute interval (for CGM alignment) */
function roundTo5Min(date) {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 5) * 5;
    const result = new Date(date);
    result.setMinutes(roundedMinutes, 0, 0);
    return result;
}
/** Generate 5-minute interval timestamps for a date range */
function generate5MinIntervals(start, end) {
    const intervals = [];
    let current = roundTo5Min(start);
    const roundedEnd = roundTo5Min(end);
    while (current <= roundedEnd) {
        intervals.push(new Date(current));
        current = (0, date_fns_1.addMinutes)(current, 5);
    }
    return intervals;
}
/** Calculate minutes between two dates */
function minutesBetween(start, end) {
    return (0, date_fns_1.differenceInMinutes)(end, start);
}
/** Check if date is valid */
function isValidDate(date) {
    return date instanceof Date && (0, date_fns_1.isValid)(date);
}
// ============================================
// ID GENERATION
// ============================================
/** Generate UUID v4 */
function generateId() {
    return (0, uuid_1.v4)();
}
/** Generate short ID (8 chars) for client-facing identifiers */
function generateShortId() {
    return (0, uuid_1.v4)().slice(0, 8);
}
exports.INSULIN_PK_PARAMS = {
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
        ka: 0.008, // regular component
        ke: 0.003, // NPH component dominant
        tMax: 240,
        bioavailability: 0.72,
    },
    glargine: {
        ka: 0.001,
        ke: 0.0008,
        tMax: 0, // flat profile
        bioavailability: 0.90,
    },
    degludec: {
        ka: 0.0008,
        ke: 0.0006,
        tMax: 0, // ultra-long flat
        bioavailability: 0.95,
    },
};
/** Calculate Insulin On Board (IOB) using two-compartment model */
function calculateIOB(doseU, minutesSinceInjection, insulinType) {
    const params = exports.INSULIN_PK_PARAMS[insulinType];
    if (!params || minutesSinceInjection < 0)
        return 0;
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
function calculateTotalIOB(injections) {
    return injections.reduce((sum, inj) => sum + calculateIOB(inj.doseU, inj.minutesAgo, inj.type), 0);
}
exports.INDIAN_CARB_ABSORPTION = {
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
function generateAbsorptionCurve(totalCarbsG, mealType = 'default', durationMin = 240) {
    const phases = exports.INDIAN_CARB_ABSORPTION[mealType] || exports.INDIAN_CARB_ABSORPTION.default;
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
function getAbsorptionProfile(totalCarbsG, mealType = 'default') {
    const phases = exports.INDIAN_CARB_ABSORPTION[mealType] || exports.INDIAN_CARB_ABSORPTION.default;
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
function mmolToMgDl(mmol) {
    return Math.round(mmol * 18.018);
}
/** Convert mg/dL to mmol/L */
function mgDlToMmol(mgDl) {
    return Math.round((mgDl / 18.018) * 10) / 10;
}
/** Convert grams to typical Indian serving units */
function gramsToServings(grams, typicalServingG) {
    return Math.round((grams / typicalServingG) * 10) / 10;
}
// ============================================
// VALIDATION HELPERS
// ============================================
/** Validate glucose value (mg/dL) */
function validateGlucose(value) {
    return Number.isInteger(value) && value >= 20 && value <= 400;
}
/** Validate insulin dose (U) */
function validateInsulinDose(value) {
    return typeof value === 'number' && value > 0 && value <= 50;
}
/** Validate carb amount (g) */
function validateCarbs(value) {
    return typeof value === 'number' && value >= 0 && value <= 300;
}
/** Validate ICR (g/U) */
function validateICR(value) {
    return typeof value === 'number' && value > 0 && value <= 100;
}
/** Validate ISF (mg/dL/U) */
function validateISF(value) {
    return typeof value === 'number' && value > 0 && value <= 200;
}
// ============================================
// FORMATTERS
// ============================================
/** Format glucose for display */
function formatGlucose(mgDl, showUnit = true) {
    return `${mgDl}${showUnit ? ' mg/dL' : ''}`;
}
/** Format insulin dose for display */
function formatInsulinDose(units) {
    return `${units.toFixed(1)} U`;
}
/** Format carbs for display */
function formatCarbs(grams) {
    return `${Math.round(grams)} g`;
}
/** Format time ago (e.g., "5 min ago", "2 hr ago") */
function formatTimeAgo(date) {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1)
        return 'just now';
    if (diffMin < 60)
        return `${diffMin} min ago`;
    if (diffHr < 24)
        return `${diffHr} hr ago`;
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}
// ============================================
// INDIAN-SPECIFIC HELPERS
// ============================================
/** Common Indian reference objects for portion estimation */
exports.INDIAN_REFERENCE_OBJECTS = {
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
};
/** Estimate portion from reference object */
function estimatePortionFromReference(referenceKey, count = 1) {
    const ref = exports.INDIAN_REFERENCE_OBJECTS[referenceKey];
    return ref.weightG * count;
}
/** Get meal type from time of day (Indian context) */
function getMealTypeFromTime(date) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 11)
        return 'breakfast';
    if (hour >= 11 && hour < 16)
        return 'lunch';
    if (hour >= 16 && hour < 22)
        return 'dinner';
    return 'snack';
}
//# sourceMappingURL=index.js.map