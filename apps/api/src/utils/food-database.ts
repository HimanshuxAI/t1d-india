// Food Database Utilities
// Indian food absorption profiles, reference objects, meal type detection

import { INDIAN_CARB_ABSORPTION, generateAbsorptionCurve, getAbsorptionProfile } from '@t1d-india/shared';
import type { AbsorptionProfile } from '@t1d-india/shared';

export interface FoodNutrition {
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG: number;
}

export interface MealAbsorptionPhase {
  name: 'rapid' | 'intermediate' | 'slow';
  carbsG: number;
  kAbs: number;
  delayMin: number;
}

/**
 * Get meal type key for absorption profile from meal type enum
 */
export function getMealTypeKey(mealType: string): string {
  const key = mealType.toLowerCase();
  if (key in INDIAN_CARB_ABSORPTION) return key;
  return 'default';
}

/**
 * Calculate nutrition for a meal item
 */
export function calculateItemNutrition(
  food: {
    carbsG: number;
    proteinG: number | null;
    fatG: number | null;
    fiberG: number | null;
  },
  quantityG: number,
  prepMethod: string = 'boiled'
): FoodNutrition {
  const multiplier = quantityG / 100;
  const prepMultiplier = getPrepMultiplier(prepMethod);

  return {
    carbsG: Math.round(food.carbsG * multiplier * prepMultiplier.carbs * 10) / 10,
    proteinG: food.proteinG ? Math.round(food.proteinG * multiplier * prepMultiplier.protein * 10) / 10 : 0,
    fatG: food.fatG ? Math.round(food.fatG * multiplier * prepMultiplier.fat * 10) / 10 : 0,
    fiberG: food.fiberG ? Math.round(food.fiberG * multiplier * 10) / 10 : 0,
  };
}

interface PrepMultipliers {
  carbs: number;
  protein: number;
  fat: number;
}

function getPrepMultiplier(prepMethod: string): PrepMultipliers {
  const multipliers: Record<string, PrepMultipliers> = {
    raw: { carbs: 1.0, protein: 1.0, fat: 1.0 },
    boiled: { carbs: 1.0, protein: 1.0, fat: 1.0 },
    steamed: { carbs: 1.0, protein: 1.0, fat: 1.0 },
    fried: { carbs: 1.05, protein: 1.0, fat: 1.3 },
    roasted: { carbs: 1.02, protein: 1.0, fat: 1.1 },
    baked: { carbs: 1.02, protein: 1.0, fat: 1.1 },
    pressure_cooked: { carbs: 1.0, protein: 1.0, fat: 1.0 },
    sautéed: { carbs: 1.02, protein: 1.0, fat: 1.2 },
    grilled: { carbs: 1.0, protein: 1.0, fat: 1.05 },
  };

  return multipliers[prepMethod] || multipliers.boiled;
}

/**
 * Generate absorption profile for a meal
 */
export function generateMealAbsorptionProfile(
  totalCarbsG: number,
  mealType: string
): AbsorptionProfile {
  return getAbsorptionProfile(totalCarbsG, getMealTypeKey(mealType));
}

/**
 * Estimate portion from Indian reference objects
 */
export function estimatePortionFromReference(
  reference: string,
  count: number = 1
): number {
  const references: Record<string, number> = {
    katori: 150,
    small_katori: 100,
    chapati: 30,
    small_chapati: 20,
    large_chapati: 40,
    paratha: 60,
    tablespoon: 15,
    teaspoon: 5,
    ladle: 60,
    glass: 200,
    small_glass: 150,
    bowl: 200,
    plate: 250,
  };

  return (references[reference.toLowerCase()] || 100) * count;
}

/**
 * Detect meal type from time (Indian context)
 */
export function detectMealTypeFromTime(date: Date = new Date()): 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'BREAKFAST';
  if (hour >= 11 && hour < 16) return 'LUNCH';
  if (hour >= 16 && hour < 22) return 'DINNER';
  return 'SNACK';
}

/**
 * Search foods with fuzzy matching for Indian names
 */
export function buildFoodSearchQuery(
  query: string,
  locale: string = 'en',
  category?: string,
  region?: string
) {
  const searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 1);

  return {
    where: {
      OR: [
        { nameEn: { contains: query, mode: 'insensitive' as const } },
        { nameHi: { contains: query, mode: 'insensitive' as const } },
        locale !== 'en' && {
          nameRegional: {
            path: [locale],
            string_contains: query,
          },
        },
      ].filter(Boolean),
      ...(category && { category }),
      ...(region && { regionTags: { has: region } }),
    },
    orderBy: [
      { confidenceScore: 'desc' as const },
      { nameEn: 'asc' as const },
    ],
  };
}

/**
 * Calculate glycemic load for a food item
 */
export function calculateGlycemicLoad(
  carbsG: number,
  glycemicIndex: number | null
): number {
  if (!glycemicIndex) return 0;
  return Math.round((carbsG * glycemicIndex) / 100 * 10) / 10;
}

/**
 * Get composite meal by name with nutrition
 */
export async function getCompositeMealWithNutrition(
  prisma: any,
  mealId: string
) {
  const meal = await prisma.compositeMeal.findUnique({
    where: { id: mealId },
  });

  if (!meal) return null;

  return {
    ...meal,
    totalCarbsG: Number(meal.totalCarbsG),
    totalProteinG: meal.totalProteinG ? Number(meal.totalProteinG) : undefined,
    totalFatG: meal.totalFatG ? Number(meal.totalFatG) : undefined,
    totalFiberG: meal.totalFiberG ? Number(meal.totalFiberG) : undefined,
    totalEnergyKcal: meal.totalEnergyKcal ? Number(meal.totalEnergyKcal) : undefined,
    estimatedGl: meal.estimatedGl ? Number(meal.estimatedGl) : undefined,
    absorptionProfile: generateMealAbsorptionProfile(Number(meal.totalCarbsG), meal.mealTypeTags[0]?.toLowerCase() || 'default'),
  };
}