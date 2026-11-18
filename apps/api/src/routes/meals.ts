// Meal Logging Routes

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  CreateMealLogSchema,
  MealLogResponseSchema,
  PaginationParamsSchema,
  MealType,
  InputMethod,
  AppError,
  ERROR_CODES,
  getAbsorptionProfile,
} from '@t1d-india/shared';

export const mealRoutes: FastifyPluginAsync = async (app) => {
  // Create meal log
  app.post('/', {
    schema: {
      body: CreateMealLogSchema,
      response: { 201: MealLogResponseSchema },
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const input = request.body as z.infer<typeof CreateMealLogSchema>;
    const userId = request.user!.id;

    // Calculate nutrition totals
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalFiber = 0;

    const enrichedItems = await Promise.all(input.items.map(async (item) => {
      let carbsG = 0;
      let proteinG = 0;
      let fatG = 0;

      if (item.foodId) {
        const food = await app.prisma.food.findUnique({
          where: { id: item.foodId },
        });

        if (food) {
          const multiplier = item.quantityG / 100;
          carbsG = Number(food.carbsG) * multiplier;
          proteinG = food.proteinG ? Number(food.proteinG) * multiplier : 0;
          fatG = food.fatG ? Number(food.fatG) * multiplier : 0;
          totalFiber += food.fiberG ? Number(food.fiberG) * multiplier : 0;
        }
      }

      // Allow manual override
      if (item.carbsOverrideG) {
        carbsG = item.carbsOverrideG;
      }

      totalCarbs += carbsG;
      totalProtein += proteinG;
      totalFat += fatG;

      return {
        ...item,
        carbsG: Math.round(carbsG * 10) / 10,
        proteinG: Math.round(proteinG * 10) / 10,
        fatG: Math.round(fatG * 10) / 10,
      };
    }));

    // Generate absorption profile
    const mealTypeKey = input.mealType.toLowerCase();
    const absorptionProfile = getAbsorptionProfile(totalCarbs, mealTypeKey);

    // Create meal log
    const mealLog = await app.prisma.mealLog.create({
      data: {
        userId,
        mealTime: new Date(input.mealTime),
        mealType: input.mealType,
        inputMethod: input.inputMethod,
        items: enrichedItems,
        totalCarbsG: totalCarbs,
        totalProteinG: totalProtein,
        totalFatG: totalFat,
        totalFiberG: totalFiber,
        absorptionProfile,
        locationType: input.locationType,
        hungerLevel: input.hungerLevel,
        moodTag: input.moodTag,
        notes: input.notes,
        clientId: request.headers['x-client-id'] as string,
      },
    });

    // Invalidate cache
    await app.cache.delPattern(`meals:${userId}:*`);

    return reply.code(201).send({
      id: mealLog.id,
      totalCarbsG: Number(mealLog.totalCarbsG),
      totalProteinG: mealLog.totalProteinG ? Number(mealLog.totalProteinG) : undefined,
      totalFatG: mealLog.totalFatG ? Number(mealLog.totalFatG) : undefined,
      totalFiberG: mealLog.totalFiberG ? Number(mealLog.totalFiberG) : undefined,
      absorptionProfile: mealLog.absorptionProfile as any,
      loggedAt: mealLog.loggedAt.toISOString(),
    });
  });

  // Get meal logs with pagination
  app.get('/', {
    schema: {
      querystring: PaginationParamsSchema.extend({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        mealType: z.nativeEnum(MealType).optional(),
      }),
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;
    const { page, limit, sortBy, sortOrder, startDate, endDate, mealType } = request.query as any;

    const cacheKey = `meals:${userId}:${page}:${limit}:${sortBy}:${sortOrder}:${startDate}:${endDate}:${mealType}`;
    const cached = await app.cache.get(cacheKey);
    if (cached) return cached;

    const where: any = { userId };
    if (startDate || endDate) {
      where.mealTime = {};
      if (startDate) where.mealTime.gte = new Date(startDate);
      if (endDate) where.mealTime.lte = new Date(endDate);
    }
    if (mealType) where.mealType = mealType;

    const [logs, total] = await Promise.all([
      app.prisma.mealLog.findMany({
        where,
        orderBy: { [sortBy || 'mealTime']: sortOrder || 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      app.prisma.mealLog.count({ where }),
    ]);

    const response = {
      data: logs.map((log) => ({
        id: log.id,
        mealTime: log.mealTime.toISOString(),
        mealType: log.mealType,
        inputMethod: log.inputMethod,
        items: log.items,
        totalCarbsG: Number(log.totalCarbsG),
        totalProteinG: log.totalProteinG ? Number(log.totalProteinG) : undefined,
        totalFatG: log.totalFatG ? Number(log.totalFatG) : undefined,
        totalFiberG: log.totalFiberG ? Number(log.totalFiberG) : undefined,
        absorptionProfile: log.absorptionProfile,
        locationType: log.locationType,
        hungerLevel: log.hungerLevel,
        moodTag: log.moodTag,
        notes: log.notes,
        loggedAt: log.loggedAt.toISOString(),
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

    await app.cache.set(cacheKey, response, 60); // 1 minute cache
    return response;
  });

  // Get single meal log
  app.get('/:id', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const log = await app.prisma.mealLog.findFirst({
      where: { id, userId },
    });

    if (!log) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Meal log not found', 404);
    }

    return {
      id: log.id,
      mealTime: log.mealTime.toISOString(),
      mealType: log.mealType,
      inputMethod: log.inputMethod,
      items: log.items,
      totalCarbsG: Number(log.totalCarbsG),
      totalProteinG: log.totalProteinG ? Number(log.totalProteinG) : undefined,
      totalFatG: log.totalFatG ? Number(log.totalFatG) : undefined,
      totalFiberG: log.totalFiberG ? Number(log.totalFiberG) : undefined,
      absorptionProfile: log.absorptionProfile,
      locationType: log.locationType,
      hungerLevel: log.hungerLevel,
      moodTag: log.moodTag,
      notes: log.notes,
      loggedAt: log.loggedAt.toISOString(),
    };
  });

  // Update meal log
  app.patch('/:id', {
    schema: {
      body: CreateMealLogSchema.partial(),
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const input = request.body as any;

    // Check ownership
    const existing = await app.prisma.mealLog.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Meal log not found', 404);
    }

    // Recalculate if items changed
    let updateData: any = { ...input };
    if (input.items) {
      let totalCarbs = 0, totalProtein = 0, totalFat = 0, totalFiber = 0;
      const enrichedItems = await Promise.all(input.items.map(async (item: any) => {
        let carbsG = 0, proteinG = 0, fatG = 0;
        if (item.foodId) {
          const food = await app.prisma.food.findUnique({ where: { id: item.foodId } });
          if (food) {
            const mult = item.quantityG / 100;
            carbsG = Number(food.carbsG) * mult;
            proteinG = food.proteinG ? Number(food.proteinG) * mult : 0;
            fatG = food.fatG ? Number(food.fatG) * mult : 0;
            totalFiber += food.fiberG ? Number(food.fiberG) * mult : 0;
          }
        }
        if (item.carbsOverrideG) carbsG = item.carbsOverrideG;
        totalCarbs += carbsG;
        totalProtein += proteinG;
        totalFat += fatG;
        return { ...item, carbsG, proteinG, fatG };
      }));

      updateData.items = enrichedItems;
      updateData.totalCarbsG = totalCarbs;
      updateData.totalProteinG = totalProtein;
      updateData.totalFatG = totalFat;
      updateData.totalFiberG = totalFiber;
      updateData.absorptionProfile = getAbsorptionProfile(totalCarbs, input.mealType?.toLowerCase() || 'default');
    }

    if (input.mealTime) updateData.mealTime = new Date(input.mealTime);

    const updated = await app.prisma.mealLog.update({
      where: { id },
      data: updateData,
    });

    await app.cache.delPattern(`meals:${userId}:*`);

    return {
      id: updated.id,
      totalCarbsG: Number(updated.totalCarbsG),
      totalProteinG: updated.totalProteinG ? Number(updated.totalProteinG) : undefined,
      totalFatG: updated.totalFatG ? Number(updated.totalFatG) : undefined,
      totalFiberG: updated.totalFiberG ? Number(updated.totalFiberG) : undefined,
      absorptionProfile: updated.absorptionProfile,
      loggedAt: updated.loggedAt.toISOString(),
    };
  });

  // Delete meal log
  app.delete('/:id', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const existing = await app.prisma.mealLog.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Meal log not found', 404);
    }

    await app.prisma.mealLog.delete({ where: { id } });
    await app.cache.delPattern(`meals:${userId}:*`);

    return reply.code(204).send();
  });
};