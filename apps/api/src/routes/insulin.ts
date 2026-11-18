// Insulin Logging & Bolus Calculation Routes

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  CreateInsulinLogSchema,
  BolusCalculationRequestSchema,
  BolusCalculationResponseSchema,
  PaginationParamsSchema,
  InsulinType,
  InjectionSite,
  DeliveryMethod,
  AppError,
  ERROR_CODES,
  INSULIN_SAFETY,
  calculateIOB,
} from '@t1d-india/shared';

export const insulinRoutes: FastifyPluginAsync = async (app) => {
  // Calculate bolus recommendation
  app.post('/calculate-bolus', {
    schema: {
      body: BolusCalculationRequestSchema,
      response: { 200: BolusCalculationResponseSchema },
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request) => {
    const input = request.body as z.infer<typeof BolusCalculationRequestSchema>;
    const userId = request.user!.id;

    // Get patient profile for defaults
    const profile = await app.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Patient profile not found', 404);
    }

    // Get current IOB
    const now = new Date();
    const recentInsulin = await app.prisma.insulinLog.findMany({
      where: {
        userId,
        administeredAt: { gte: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
      },
      orderBy: { administeredAt: 'desc' },
    });

    let iobRapid = 0, iobRegular = 0, iobNph = 0;

    for (const insulin of recentInsulin) {
      const minAgo = (now.getTime() - insulin.administeredAt.getTime()) / 60000;
      const dose = Number(insulin.doseU);

      switch (insulin.insulinType) {
        case 'RAPID_LISPRO':
        case 'RAPID_ASPART':
        case 'RAPID_GLULISINE':
          iobRapid += calculateIOB(dose, minAgo, 'rapid');
          break;
        case 'REGULAR_HUMAN':
          iobRegular += calculateIOB(dose, minAgo, 'regular');
          break;
        case 'NPH_HUMAN':
          iobNph += calculateIOB(dose, minAgo, 'nph');
          break;
        case 'PREMIXED_30_70':
        case 'PREMIXED_50_50':
          // Split between regular and NPH components
          iobRegular += calculateIOB(dose * 0.3, minAgo, 'regular');
          iobNph += calculateIOB(dose * 0.7, minAgo, 'nph');
          break;
      }
    }

    // Check recent hypoglycemia
    const recentHypo = await app.prisma.hypoAlert.findFirst({
      where: {
        userId,
        triggeredAt: { gte: new Date(now.getTime() - INSULIN_SAFETY.RECENT_HYPO_WINDOW_MIN * 60000) },
        alertLevel: { in: ['URGENT', 'EMERGENCY'] },
      },
    });

    // Get last meal time
    const lastMeal = await app.prisma.mealLog.findFirst({
      where: { userId },
      orderBy: { mealTime: 'desc' },
    });
    const timeSinceLastMeal = lastMeal
      ? (now.getTime() - lastMeal.mealTime.getTime()) / 60000
      : undefined;

    // Calculate bolus using shared logic
    const result = calculateBolus({
      carbsG: input.carbsG,
      currentGlucose: input.currentGlucoseMgDl,
      iobRapid,
      iobRegular,
      iobNph,
      icr: Number(input.icrGPerU || profile.icrGPerU || 10),
      isf: Number(input.isfMgDlPerU || profile.isfMgDlPerU || 50),
      regimen: input.regimen || profile.insulinRegimen,
      recentHypo: !!recentHypo,
      timeSinceLastMealMin: timeSinceLastMeal,
    });

    return result;
  });

  // Create insulin log
  app.post('/', {
    schema: {
      body: CreateInsulinLogSchema,
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const input = request.body as z.infer<typeof CreateInsulinLogSchema>;
    const userId = request.user!.id;

    // Verify related meal log exists if provided
    if (input.relatedMealLogId) {
      const meal = await app.prisma.mealLog.findFirst({
        where: { id: input.relatedMealLogId, userId },
      });
      if (!meal) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Related meal log not found', 404);
      }
    }

    const log = await app.prisma.insulinLog.create({
      data: {
        userId,
        administeredAt: new Date(input.administeredAt),
        insulinType: input.insulinType,
        doseU: input.doseU,
        injectionSite: input.injectionSite,
        relatedMealLogId: input.relatedMealLogId,
        glucoseAtInjection: input.glucoseAtInjection,
        carbEstimateG: input.carbEstimateG,
        calculatorRecommendedU: input.calculatorRecommendedU,
        overrideReason: input.overrideReason,
        deliveryMethod: input.deliveryMethod,
        deviceId: input.deviceId,
        clientId: request.headers['x-client-id'] as string,
      },
    });

    // Invalidate cache
    await app.cache.delPattern(`insulin:${userId}:*`);
    await app.cache.delPattern(`predictions:${userId}:*`);

    return reply.code(201).send({
      id: log.id,
      administeredAt: log.administeredAt.toISOString(),
      insulinType: log.insulinType,
      doseU: Number(log.doseU),
      injectionSite: log.injectionSite,
    });
  });

  // Get insulin logs
  app.get('/', {
    schema: {
      querystring: PaginationParamsSchema.extend({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        insulinType: z.nativeEnum(InsulinType).optional(),
      }),
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;
    const { page, limit, sortBy, sortOrder, startDate, endDate, insulinType } = request.query as any;

    const where: any = { userId };
    if (startDate || endDate) {
      where.administeredAt = {};
      if (startDate) where.administeredAt.gte = new Date(startDate);
      if (endDate) where.administeredAt.lte = new Date(endDate);
    }
    if (insulinType) where.insulinType = insulinType;

    const [logs, total] = await Promise.all([
      app.prisma.insulinLog.findMany({
        where,
        orderBy: { [sortBy || 'administeredAt']: sortOrder || 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { relatedMealLog: true },
      }),
      app.prisma.insulinLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        administeredAt: log.administeredAt.toISOString(),
        insulinType: log.insulinType,
        doseU: Number(log.doseU),
        injectionSite: log.injectionSite,
        relatedMealLog: log.relatedMealLog ? {
          id: log.relatedMealLog.id,
          mealTime: log.relatedMealLog.mealTime.toISOString(),
          totalCarbsG: Number(log.relatedMealLog.totalCarbsG),
        } : null,
        glucoseAtInjection: log.glucoseAtInjection,
        carbEstimateG: log.carbEstimateG ? Number(log.carbEstimateG) : undefined,
        calculatorRecommendedU: log.calculatorRecommendedU ? Number(log.calculatorRecommendedU) : undefined,
        overrideReason: log.overrideReason,
        deliveryMethod: log.deliveryMethod,
        deviceId: log.deviceId,
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
  });

  // Get insulin log by ID
  app.get('/:id', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const log = await app.prisma.insulinLog.findFirst({
      where: { id, userId },
      include: { relatedMealLog: true },
    });

    if (!log) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Insulin log not found', 404);
    }

    return {
      id: log.id,
      administeredAt: log.administeredAt.toISOString(),
      insulinType: log.insulinType,
      doseU: Number(log.doseU),
      injectionSite: log.injectionSite,
      relatedMealLog: log.relatedMealLog ? {
        id: log.relatedMealLog.id,
        mealTime: log.relatedMealLog.mealTime.toISOString(),
        totalCarbsG: Number(log.relatedMealLog.totalCarbsG),
      } : null,
      glucoseAtInjection: log.glucoseAtInjection,
      carbEstimateG: log.carbEstimateG ? Number(log.carbEstimateG) : undefined,
      calculatorRecommendedU: log.calculatorRecommendedU ? Number(log.calculatorRecommendedU) : undefined,
      overrideReason: log.overrideReason,
      deliveryMethod: log.deliveryMethod,
      deviceId: log.deviceId,
      loggedAt: log.loggedAt.toISOString(),
    };
  });

  // Delete insulin log
  app.delete('/:id', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const existing = await app.prisma.insulinLog.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Insulin log not found', 404);
    }

    await app.prisma.insulinLog.delete({ where: { id } });
    await app.cache.delPattern(`insulin:${userId}:*`);
    await app.cache.delPattern(`predictions:${userId}:*`);

    return reply.code(204).send();
  });

  // Get daily insulin summary
  app.get('/summary/daily', {
    schema: {
      querystring: z.object({
        date: z.string().date().optional(),
      }),
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;
    const { date } = request.query as any;
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await app.prisma.insulinLog.findMany({
      where: {
        userId,
        administeredAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { administeredAt: 'asc' },
    });

    const totals = logs.reduce((acc, log) => {
      const dose = Number(log.doseU);
      switch (log.insulinType) {
        case 'RAPID_LISPRO':
        case 'RAPID_ASPART':
        case 'RAPID_GLULISINE':
          acc.rapid += dose;
          break;
        case 'REGULAR_HUMAN':
          acc.regular += dose;
          break;
        case 'NPH_HUMAN':
          acc.nph += dose;
          break;
        case 'PREMIXED_30_70':
        case 'PREMIXED_50_50':
          acc.premixed += dose;
          break;
        case 'GLARGINE_U100':
        case 'GLARGINE_U300':
        case 'DEGLUDEC_U100':
        case 'DEGLUDEC_U200':
          acc.basal += dose;
          break;
        case 'BASAL_PUMP':
          acc.basal += dose;
          break;
      }
      acc.total += dose;
      return acc;
    }, { rapid: 0, regular: 0, nph: 0, premixed: 0, basal: 0, total: 0 });

    return {
      date: targetDate.toISOString().split('T')[0],
      totals,
      injections: logs.length,
      logs: logs.map((log) => ({
        time: log.administeredAt.toISOString(),
        type: log.insulinType,
        doseU: Number(log.doseU),
        site: log.injectionSite,
      })),
    };
  });
};

// Bolus calculation logic (shared with ML service)
function calculateBolus(input: {
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
}) {
  const { carbsG, currentGlucose, iobRapid, iobRegular, iobNph, icr, isf, regimen, recentHypo, timeSinceLastMealMin } = input;

  const warnings: string[] = [];
  let mealBolus = 0;
  let correctionBolus = 0;

  // 1. Meal bolus
  if (carbsG > 0 && icr > 0) {
    mealBolus = carbsG / icr;
  }

  // 2. Correction bolus
  if (currentGlucose > INSULIN_SAFETY.TARGET_GLUCOSE && !recentHypo && currentGlucose >= INSULIN_SAFETY.MIN_GLUCOSE_FOR_CORRECTION) {
    correctionBolus = (currentGlucose - INSULIN_SAFETY.TARGET_GLUCOSE) / isf;
    correctionBolus = Math.min(correctionBolus, INSULIN_SAFETY.MAX_CORRECTION_U);
  }

  // 3. IOB adjustment
  const totalIob = iobRapid + iobRegular * 0.5 + iobNph * 0.3;
  let iobAdjustment = 0;
  if (totalIob > INSULIN_SAFETY.IOB_HIGH_THRESHOLD_U) {
    warnings.push(`High IOB (${totalIob.toFixed(1)}U) - consider reducing bolus`);
    iobAdjustment = Math.max(0, (totalIob - INSULIN_SAFETY.IOB_HIGH_THRESHOLD_U) * INSULIN_SAFETY.MAX_IOB_ADJUSTMENT_FACTOR);
  }

  // 4. Regimen-specific adjustments
  let regimenAdjustment = 0;
  if (regimen === 'NPH_REGULAR' && timeSinceLastMealMin && timeSinceLastMealMin >= 240 && timeSinceLastMealMin <= 480) {
    warnings.push('Morning NPH may be peaking - consider 20% bolus reduction');
    regimenAdjustment = -0.2 * (iobRapid + iobRegular);
  } else if (regimen === 'PREMIXED_30_70' && timeSinceLastMealMin && timeSinceLastMealMin >= 180 && timeSinceLastMealMin <= 360) {
    warnings.push('Premixed NPH component active - reduced correction recommended');
    regimenAdjustment = -0.15 * iobNph;
  }

  // 5. Total bolus
  let totalBolus = mealBolus + correctionBolus - iobAdjustment + regimenAdjustment;
  totalBolus = Math.max(0, totalBolus);

  // 6. Safety cap
  const maxAllowed = INSULIN_SAFETY.MAX_BOLUS_U;
  if (totalBolus > maxAllowed) {
    warnings.push(`Calculated bolus (${totalBolus.toFixed(1)}U) exceeds max (${maxAllowed}U)`);
    totalBolus = maxAllowed;
  }

  // 7. Predicted glucose floor check
  const predictedDrop = totalBolus * isf;
  const predictedMin = currentGlucose - predictedDrop;
  if (predictedMin < INSULIN_SAFETY.MIN_PREDICTED_GLUCOSE) {
    warnings.push(`Predicted glucose may drop to ${Math.round(predictedMin)} mg/dL`);
    const safeBolus = (currentGlucose - 80) / isf;
    totalBolus = Math.min(totalBolus, Math.max(0, safeBolus));
  }

  // 8. Recent hypo warning
  if (recentHypo) {
    warnings.push('Recent hypoglycemia detected - consider reducing bolus by 25-50%');
  }

  // Generate explanation
  const explanation = [
    `Meal bolus: ${mealBolus.toFixed(1)}U (${carbsG}g / ${icr}g/U)`,
    correctionBolus > 0 ? `Correction: ${correctionBolus.toFixed(1)}U ((${currentGlucose}-${INSULIN_SAFETY.TARGET_GLUCOSE}) / ${isf})` : 'No correction needed',
    iobAdjustment > 0 ? `IOB adjustment: -${iobAdjustment.toFixed(1)}U` : '',
    regimenAdjustment !== 0 ? `Regimen adjustment: ${regimenAdjustment > 0 ? '+' : ''}${regimenAdjustment.toFixed(1)}U` : '',
  ].filter(Boolean).join('; ');

  return {
    mealBolusU: Math.round(mealBolus * 10) / 10,
    correctionBolusU: Math.round(correctionBolus * 10) / 10,
    totalBolusU: Math.round(totalBolus * 10) / 10,
    maxAllowedU: maxAllowed,
    warnings,
    explanation,
    safetyCheck: {
      predictedMinGlucose: Math.round(predictedMin),
      iobTotalU: Math.round(totalIob * 10) / 10,
    },
  };
}