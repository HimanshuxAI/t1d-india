// Hypoglycemia Prediction Routes

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError, ERROR_CODES, HYPO_PREDICTION } from '@t1d-india/shared';
import axios from 'axios';

export const predictionRoutes: FastifyPluginAsync = async (app) => {
  // Get latest hypoglycemia prediction
  app.get('/hypo/latest', {
    schema: {
      querystring: z.object({
        horizons: z.array(z.number().int()).default([30, 60]),
      }),
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;
    const { horizons } = request.query as any;

    const cacheKey = `predictions:hypo:latest:${userId}`;
    const cached = await app.cache.get(cacheKey);
    if (cached) return cached;

    // Get latest prediction from database
    const predictions = await app.prisma.hypoPrediction.findMany({
      where: {
        userId,
        predictionHorizonMin: { in: horizons },
      },
      orderBy: { predictedAt: 'desc' },
      take: horizons.length,
    });

    if (predictions.length === 0) {
      // No predictions yet - trigger async prediction
      await triggerPrediction(app, userId);
      return { predictions: [] };
    }

    // Check if predictions are stale (>5 min old)
    const latestPred = predictions[0];
    const ageMin = (Date.now() - latestPred.predictedAt.getTime()) / 60000;

    if (ageMin > 5) {
      // Trigger fresh prediction in background
      triggerPrediction(app, userId).catch(console.error);
    }

    const result = {
      predictions: predictions.map((p) => ({
        horizonMin: p.predictionHorizonMin,
        glucoseP10: p.glucoseP10,
        glucoseP50: p.glucoseP50,
        glucoseP90: p.glucoseP90,
        hypoProbability: Number(p.hypoProbability),
        severeHypoProbability: Number(p.severeHypoProbability),
        topFeatures: p.topFeatures as any,
        predictedAt: p.predictedAt.toISOString(),
        modelVersion: p.modelVersion,
      })),
    };

    await app.cache.set(cacheKey, result, 60); // 1 minute
    return result;
  });

  // Get prediction history
  app.get('/hypo/history', {
    schema: {
      querystring: z.object({
        hours: z.coerce.number().int().min(1).max(168).default(24),
        horizon: z.number().int().optional(),
      }),
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;
    const { hours, horizon } = request.query as any;

    const where: any = {
      userId,
      predictedAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
    };
    if (horizon) where.predictionHorizonMin = horizon;

    const predictions = await app.prisma.hypoPrediction.findMany({
      where,
      orderBy: { predictedAt: 'asc' },
    });

    return {
      predictions: predictions.map((p) => ({
        horizonMin: p.predictionHorizonMin,
        glucoseP10: p.glucoseP10,
        glucoseP50: p.glucoseP50,
        glucoseP90: p.glucoseP90,
        hypoProbability: Number(p.hypoProbability),
        severeHypoProbability: Number(p.severeHypoProbability),
        topFeatures: p.topFeatures as any,
        predictedAt: p.predictedAt.toISOString(),
        modelVersion: p.modelVersion,
        // Outcomes if available
        actualGlucose30min: p.actualGlucose30min,
        actualGlucose60min: p.actualGlucose60min,
        wasHypo30min: p.wasHypo30min,
        wasHypo60min: p.wasHypo60min,
      })),
    };
  });

  // Manually trigger prediction (for testing)
  app.post('/hypo/trigger', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const userId = request.user!.id;
    await triggerPrediction(app, userId);
    return reply.code(202).send({ message: 'Prediction triggered' });
  });

  // Get model info
  app.get('/models', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async () => {
    const models = await app.prisma.mLModel.findMany({
      where: { status: { in: ['staging', 'production'] } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        version: m.version,
        type: m.type,
        framework: m.framework,
        metrics: m.metrics,
        status: m.status,
        deployedAt: m.deployedAt?.toISOString(),
      })),
    };
  });
};

// Trigger ML prediction via ML service
async function triggerPrediction(app: any, userId: string) {
  try {
    // Gather required data for prediction
    const [profile, latestCGM, recentMeals, recentInsulin] = await Promise.all([
      app.prisma.patientProfile.findUnique({ where: { userId } }),
      app.prisma.cGMReading.findFirst({
        where: { userId, isValid: true },
        orderBy: { time: 'desc' },
      }),
      app.prisma.mealLog.findMany({
        where: { userId, mealTime: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } },
        orderBy: { mealTime: 'desc' },
      }),
      app.prisma.insulinLog.findMany({
        where: { userId, administeredAt: { gte: new Date(Date.now() - 8 * 60 * 60 * 1000) } },
        orderBy: { administeredAt: 'desc' },
      }),
    ]);

    if (!profile || !latestCGM) {
      app.log.warn({ userId }, 'Insufficient data for prediction');
      return;
    }

    // Prepare input for ML service
    const input = buildPredictionInput(latestCGM, recentMeals, recentInsulin, profile);

    // Call ML service
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(`${mlServiceUrl}/v1/predict/hypo`, input, {
      timeout: 5000,
      headers: { 'X-API-Key': process.env.ML_SERVICE_API_KEY || '' },
    });

    const { predictions } = response.data;

    // Store predictions
    for (const pred of predictions) {
      await app.prisma.hypoPrediction.create({
        data: {
          userId,
          predictionHorizonMin: pred.horizonMin,
          glucoseP10: pred.glucoseP10,
          glucoseP50: pred.glucoseP50,
          glucoseP90: pred.glucoseP90,
          hypoProbability: pred.hypoProbability,
          severeHypoProbability: pred.severeHypoProbability,
          topFeatures: pred.topFeatures,
          modelVersion: pred.modelVersion,
        },
      });

      // Create alerts if high probability
      if (pred.hypoProbability > 0.5) {
        await createHypoAlert(app, userId, pred);
      }
    }

    // Invalidate cache
    await app.cache.delPattern(`predictions:${userId}:*`);

  } catch (err) {
    app.log.error({ err, userId }, 'Prediction failed');
  }
}

function buildPredictionInput(
  latestCGM: any,
  recentMeals: any[],
  recentInsulin: any[],
  profile: any
) {
  // This is a simplified version - in production, use the full feature engineering
  const now = new Date();
  const steps = 6; // 30 min at 5-min intervals

  // Generate time-series features (simplified)
  const glucose = Array(steps).fill(latestCGM.glucoseMgDl);
  const roc = Array(steps).fill(0);
  const iobRapid = Array(steps).fill(0);
  const iobRegular = Array(steps).fill(0);
  const iobNph = Array(steps).fill(0);
  const carbsAbsorbing = Array(steps).fill(0);
  const steps5min = Array(steps).fill(0);
  const hr = Array(steps).fill(70);

  // Calculate IOB from recent insulin
  for (const insulin of recentInsulin) {
    const minAgo = (now.getTime() - new Date(insulin.administeredAt).getTime()) / 60000;
    if (minAgo <= 480) {
      // Add to appropriate IOB array based on insulin type
      // Simplified - in production use proper PK models
    }
  }

  // Calculate carb absorption from recent meals
  for (const meal of recentMeals) {
    const minAgo = (now.getTime() - new Date(meal.mealTime).getTime()) / 60000;
    if (minAgo <= 240 && meal.absorptionProfile) {
      // Add absorption curve
    }
  }

  return {
    glucose,
    roc,
    iobRapid,
    iobRegular,
    iobNph,
    carbsAbsorbing,
    steps5min,
    hr,
    age: calculateAge(profile.dateOfBirth),
    weight: Number(profile.weightKg || 70),
    diabetesDurationYears: calculateDiabetesDuration(profile.diagnosisDate),
    isf: Number(profile.isfMgDlPerU || 50),
    icr: Number(profile.icrGPerU || 10),
    regimenType: getRegimenType(profile.insulinRegimen),
    hypoUnawareness: 0,
  };
}

function calculateAge(dob: Date | null): number {
  if (!dob) return 30;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function calculateDiabetesDuration(diagnosisDate: Date | null): number {
  if (!diagnosisDate) return 5;
  const years = (Date.now() - diagnosisDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.floor(years));
}

function getRegimenType(regimen: string): number {
  switch (regimen) {
    case 'BASAL_BOLUS': return 0;
    case 'NPH_REGULAR': return 1;
    case 'PREMIXED_30_70':
    case 'PREMIXED_50_50': return 2;
    case 'PUMP': return 3;
    default: return 0;
  }
}

async function createHypoAlert(app: any, userId: string, prediction: any) {
  const horizon = prediction.horizonMin;
  const prob = prediction.hypoProbability;
  const severeProb = prediction.severeHypoProbability;

  let alertLevel: 'WARNING' | 'URGENT' | 'EMERGENCY' = 'WARNING';
  if (severeProb > 0.3 || (horizon === 30 && prob > 0.7)) alertLevel = 'EMERGENCY';
  else if (prob > 0.6) alertLevel = 'URGENT';

  const message = horizon === 30
    ? `⚠️ Hypoglycemia risk in 30 min: ${Math.round(prob * 100)}% chance glucose < 70 mg/dL`
    : `⚠️ Hypoglycemia risk in 60 min: ${Math.round(prob * 100)}% chance glucose < 70 mg/dL`;

  const recommendedAction = getRecommendedAction(prob, severeProb);
  const indianCarbOptions = getIndianCarbOptions();

  await app.prisma.hypoAlert.create({
    data: {
      userId,
      alertLevel,
      message,
      recommendedAction,
      indianCarbOptions,
    },
  });
}

function getRecommendedAction(prob: number, severeProb: number): string {
  if (severeProb > 0.3) {
    return 'EMERGENCY: Consume 20g fast carbs immediately (4 glucose tablets / 200ml juice / 2 tsp sugar). Call emergency contact.';
  }
  if (prob > 0.7) {
    return 'URGENT: Consume 15g fast carbs now (3 glucose tablets / 150ml juice / 1 tbsp sugar/honey). Recheck in 15 min.';
  }
  if (prob > 0.5) {
    return 'WARNING: Prepare 15g fast carbs (glucose tablets, juice, sugar). Monitor closely.';
  }
  return 'Monitor glucose. Keep fast carbs accessible.';
}

function getIndianCarbOptions() {
  return [
    { item: 'Glucose tablets (Dextro/Glucovita)', quantity: '3-4 tablets', carbsG: 12 },
    { item: 'Fruit juice (orange/mango/apple)', quantity: '150-200 ml', carbsG: 15 },
    { item: 'Sugar (white/brown)', quantity: '1 tablespoon (12g)', carbsG: 12 },
    { item: 'Honey', quantity: '1 tablespoon (21g)', carbsG: 17 },
    { item: 'Regular soda (not diet)', quantity: '150 ml', carbsG: 15 },
    { item: 'Banana (small)', quantity: '1 (80g)', carbsG: 18 },
    { item: 'Dates (khajoor)', quantity: '2-3 pieces', carbsG: 15 },
    { item: 'Raisins (kishmish)', quantity: '1 tablespoon (15g)', carbsG: 12 },
  ];
}