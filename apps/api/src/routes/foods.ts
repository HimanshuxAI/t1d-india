// Food Database Routes

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { FoodSearchParamsSchema, PaginationParamsSchema, AppError, ERROR_CODES } from '@t1d-india/shared';

const FoodSearchParamsJsonSchema = zodToJsonSchema(FoodSearchParamsSchema, {
  target: 'jsonSchema7',
  name: 'FoodSearchParams',
});
const PaginationParamsJsonSchema = zodToJsonSchema(PaginationParamsSchema, {
  target: 'jsonSchema7',
  name: 'PaginationParams',
});
const FoodListQueryJsonSchema = zodToJsonSchema(
  PaginationParamsSchema.extend({
    category: z.string().optional(),
    region: z.string().optional(),
    isComposite: z.coerce.boolean().optional(),
  }),
  {
    target: 'jsonSchema7',
    name: 'FoodListQuery',
  },
);

export const foodRoutes: FastifyPluginAsync = async (app) => {
  // Search foods with autocomplete
  app.get('/search', {
    schema: {
      querystring: FoodSearchParamsJsonSchema,
    },
  }, async (request) => {
    const { q, locale, category, region, limit } = request.query as any;

    const cacheKey = `food:search:${q}:${locale}:${category}:${region}:${limit}`;
    const cached = await app.cache.get(cacheKey);
    if (cached) return cached;

    // Build search query
    const where: any = {
      OR: [
        { nameEn: { contains: q, mode: 'insensitive' } },
        { nameHi: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (category) where.category = category;
    if (region) where.regionTags = { has: region };

    const foods = await app.prisma.food.findMany({
      where,
      take: limit,
      orderBy: [
        { confidenceScore: 'desc' },
        { nameEn: 'asc' },
      ],
      select: {
        id: true,
        nameEn: true,
        nameHi: true,
        nameRegional: true,
        category: true,
        carbsG: true,
        typicalServingG: true,
        servingDescription: true,
        confidenceScore: true,
      },
    });

    const results = foods.map((food) => ({
      id: food.id,
      name: food.nameEn,
      nameLocalized: locale !== 'en' && food.nameRegional[locale]
        ? food.nameRegional[locale]
        : food.nameHi || food.nameEn,
      category: food.category,
      carbsPer100g: Number(food.carbsG),
      typicalServingG: food.typicalServingG ? Number(food.typicalServingG) : undefined,
      servingDescription: food.servingDescription,
      confidenceScore: Number(food.confidenceScore),
    }));

    await app.cache.set(cacheKey, results, 3600); // 1 hour
    return results;
  });

  // Get food by ID
  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };

    const cacheKey = `food:detail:${id}`;
    const cached = await app.cache.get(cacheKey);
    if (cached) return cached;

    const food = await app.prisma.food.findUnique({
      where: { id },
    });

    if (!food) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Food not found', 404);
    }

    const result = {
      id: food.id,
      nameEn: food.nameEn,
      nameHi: food.nameHi,
      nameRegional: food.nameRegional,
      category: food.category,
      subcategory: food.subcategory,
      regionTags: food.regionTags,
      nutrition: {
        energyKcal: food.energyKcal ? Number(food.energyKcal) : undefined,
        carbsG: Number(food.carbsG),
        proteinG: food.proteinG ? Number(food.proteinG) : undefined,
        fatG: food.fatG ? Number(food.fatG) : undefined,
        fiberG: food.fiberG ? Number(food.fiberG) : undefined,
        sugarG: food.sugarG ? Number(food.sugarG) : undefined,
        sodiumMg: food.sodiumMg ? Number(food.sodiumMg) : undefined,
        potassiumMg: food.potassiumMg ? Number(food.potassiumMg) : undefined,
      },
      glycemic: {
        index: food.glycemicIndex,
        loadPerServing: food.glycemicLoadPerServing ? Number(food.glycemicLoadPerServing) : undefined,
      },
      serving: {
        typicalG: food.typicalServingG ? Number(food.typicalServingG) : undefined,
        description: food.servingDescription,
        referenceObjects: food.referenceObjects,
      },
      prepMethods: food.prepMethods,
      source: food.source,
      verifiedBy: food.verifiedBy,
      verifiedAt: food.verifiedAt?.toISOString(),
      confidenceScore: Number(food.confidenceScore),
      isComposite: food.isComposite,
      createdAt: food.createdAt.toISOString(),
      updatedAt: food.updatedAt.toISOString(),
    };

    await app.cache.set(cacheKey, result, 86400); // 24 hours
    return result;
  });

  // List foods with pagination
  app.get('/', {
    schema: {
      querystring: FoodListQueryJsonSchema,
    },
  }, async (request) => {
    const { page, limit, sortBy, sortOrder, category, region, isComposite } = request.query as any;

    const where: any = {};
    if (category) where.category = category;
    if (region) where.regionTags = { has: region };
    if (isComposite !== undefined) where.isComposite = isComposite;

    const [foods, total] = await Promise.all([
      app.prisma.food.findMany({
        where,
        orderBy: { [sortBy || 'nameEn']: sortOrder || 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      app.prisma.food.count({ where }),
    ]);

    return {
      data: foods.map((food) => ({
        id: food.id,
        nameEn: food.nameEn,
        nameHi: food.nameHi,
        category: food.category,
        carbsPer100g: Number(food.carbsG),
        typicalServingG: food.typicalServingG ? Number(food.typicalServingG) : undefined,
        confidenceScore: Number(food.confidenceScore),
        isComposite: food.isComposite,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  });

  // Get composite meals
  app.get('/composite/list', async (request) => {
    const { region, mealType, occasion, limit = 50 } = request.query as any;

    const where: any = {};
    if (region) where.regionTags = { has: region };
    if (mealType) where.mealTypeTags = { has: mealType };
    if (occasion) where.occasionTags = { has: occasion };

    const meals = await app.prisma.compositeMeal.findMany({
      where,
      take: limit,
      orderBy: { confidenceScore: 'desc' },
    });

    return meals.map((meal) => ({
      id: meal.id,
      nameEn: meal.nameEn,
      nameHi: meal.nameHi,
      nameRegional: meal.nameRegional,
      description: meal.description,
      regionTags: meal.regionTags,
      mealTypeTags: meal.mealTypeTags,
      occasionTags: meal.occasionTags,
      totalCarbsG: Number(meal.totalCarbsG),
      totalProteinG: meal.totalProteinG ? Number(meal.totalProteinG) : undefined,
      totalFatG: meal.totalFatG ? Number(meal.totalFatG) : undefined,
      servings: meal.servings,
      confidenceScore: Number(meal.confidenceScore),
    }));
  });

  // Get composite meal by ID
  app.get('/composite/:id', async (request) => {
    const { id } = request.params as { id: string };

    const meal = await app.prisma.compositeMeal.findUnique({
      where: { id },
    });

    if (!meal) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Composite meal not found', 404);
    }

    return {
      id: meal.id,
      nameEn: meal.nameEn,
      nameHi: meal.nameHi,
      nameRegional: meal.nameRegional,
      description: meal.description,
      regionTags: meal.regionTags,
      mealTypeTags: meal.mealTypeTags,
      occasionTags: meal.occasionTags,
      components: meal.components,
      nutrition: {
        totalCarbsG: Number(meal.totalCarbsG),
        totalProteinG: meal.totalProteinG ? Number(meal.totalProteinG) : undefined,
        totalFatG: meal.totalFatG ? Number(meal.totalFatG) : undefined,
        totalFiberG: meal.totalFiberG ? Number(meal.totalFiberG) : undefined,
        totalEnergyKcal: meal.totalEnergyKcal ? Number(meal.totalEnergyKcal) : undefined,
        estimatedGi: meal.estimatedGi,
        estimatedGl: meal.estimatedGl ? Number(meal.estimatedGl) : undefined,
      },
      servings: meal.servings,
      source: meal.source,
      verifiedBy: meal.verifiedBy,
      verifiedAt: meal.verifiedAt?.toISOString(),
      confidenceScore: Number(meal.confidenceScore),
    };
  });
};