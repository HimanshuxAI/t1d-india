// Hypoglycemia Prediction Routes

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AppError, ERROR_CODES } from '@t1d-india/shared';
import axios from 'axios';

const HypoPredictionQueryJsonSchema = zodToJsonSchema(
  z.object({
    horizons: z.array(z.number().int()).default([30, 60]),
  }),
  {
    target: 'jsonSchema7',
    name: 'HypoPredictionQuery',
  }
);

const HypoPredictionResponseJsonSchema = zodToJsonSchema(
  z.object({
    predictions: z.array(
      z.object({
        horizonMin: z.number().int(),
        glucoseP10: z.number().int(),
        glucoseP50: z.number().int(),
        glucoseP90: z.number().int(),
        hypoProbability: z.number().min(0).max(1),
        severeHypoProbability: z.number().min(0).max(1),
        topFeatures: z.array(z.object({ feature: z.string(), contribution: z.number() })),
        predictedAt: z.string().datetime(),
        modelVersion: z.string(),
      })
    ),
  }),
  {
    target: 'jsonSchema7',
    name: 'HypoPredictionResponse',
  }
);

const HypoHistoryQueryJsonSchema = zodToJsonSchema(
  z.object({
    hours: z.coerce.number().int().min(1).max(168).default(24),
    horizon: z.number().int().optional(),
  }),
  {
    target: 'jsonSchema7',
    name: 'HypoHistoryQuery',
  }
);

export const predictionRoutes: FastifyPluginAsync = async (app) => {
  // Get latest hypoglycemia prediction
  app.get('/hypo/latest', {
    schema: {
      querystring: HypoPredictionQueryJsonSchema,
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
      querystring: HypoHistoryQueryJsonSchema,
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
}

async function triggerPrediction(app: any, userId: string) {
  // Get latest CGM reading
  const latestCGM = await app.prisma.cGMReading.findFirst({
    where: { userId, isValid: true },
    orderBy: { time: 'desc' },
  });

  if (!latestCGM) return;

  // Get recent meals and insulin
  const recentMeals = await app.prisma.mealLog.findMany({
    where: { userId, mealTime: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } },
    orderBy: { mealTime: 'desc' },
  });
  
  const recentInsulin = await app.prisma.insulinLog.findMany({
    where: { userId, administeredAt: { gte: new Date(Date.now() - 8 * 60 * 60 * 1000) } },
    orderBy: { administeredAt: 'desc' },
  });

  // Prepare input for ML service
  const input = {
    glucose: [latestCGM.glucoseMgDl],
    roc: [0],
    iobRapid: [0],
    iobRegular: [0],
    iobNph: [0],
    carbsAbsorbing: [0],
    steps5min: [0],
    hr: [70],
    age: 30,
    weight: 70,
    diabetesDurationYears: 5,
    isf: 50,
    icr: 10,
    regimenType: 0,
    hypoUnawareness: 0,
  };

  // Call ML service
  try {
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
    }

    // Create alerts if needed
    for (const pred of predictions) {
      if (pred.hypoProbability > 0.5) {
        await app.prisma.hypoAlert.create({
          data: {
            userId,
            predictionId: pred.id,
            alertLevel: pred.severeHypoProbability > 0.3 ? 'EMERGENCY' : pred.hypoProbability > 0.7 ? 'URGENT' : 'WARNING',
            message: `Hypoglycemia risk in ${pred.horizonMin} min: ${Math.round(pred.hypoProbability * 100)}% chance glucose < 70 mg/dL`,
            recommendedAction: getRecommendedAction(pred.hypoProbability, pred.severeHypoProbability),
            indianCarbOptions: getIndianCarbOptions(),
          },
        });
      }
    }
  } catch (error) {
    console.error('Prediction trigger failed:', error);
  }
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
