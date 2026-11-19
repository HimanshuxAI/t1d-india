// CGM Data Routes

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CGMBatchUploadSchema,
  CGMBatchUploadResponseSchema,
  PaginationParamsSchema,
  CGMSource,
  AppError,
  ERROR_CODES,
  CGM_CONSTANTS,
} from '@t1d-india/shared';
import { roundTo5Min, generate5MinIntervals } from '@t1d-india/shared';

const CGMBatchUploadJsonSchema = zodToJsonSchema(CGMBatchUploadSchema, {
  target: 'jsonSchema7',
  name: 'CGMBatchUpload',
});
const CGMBatchUploadResponseJsonSchema = zodToJsonSchema(CGMBatchUploadResponseSchema, {
  target: 'jsonSchema7',
  name: 'CGMBatchUploadResponse',
});
const CGMReadingsQueryJsonSchema = zodToJsonSchema(
  PaginationParamsSchema.extend({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    validOnly: z.coerce.boolean().default(true),
  }),
  {
    target: 'jsonSchema7',
    name: 'CGMReadingsQuery',
  },
);
const CGMAgpQueryJsonSchema = zodToJsonSchema(
  z.object({
    days: z.coerce.number().int().min(1).max(90).default(14),
  }),
  {
    target: 'jsonSchema7',
    name: 'CGMAGPQuery',
  },
);
const CGMStatsQueryJsonSchema = zodToJsonSchema(
  z.object({
    hours: z.coerce.number().int().min(1).max(168).default(24),
  }),
  {
    target: 'jsonSchema7',
    name: 'CGMStatsQuery',
  },
);

export const cgmRoutes: FastifyPluginAsync = async (app) => {
  // Batch upload CGM readings
  app.post('/readings/batch', {
    schema: {
      body: CGMBatchUploadJsonSchema,
      response: { 202: CGMBatchUploadResponseJsonSchema },
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const { readings } = request.body as z.infer<typeof CGMBatchUploadSchema>;
    const userId = request.user!.id;

    const errors: Array<{ index: number; code: string; message: string }> = [];
    const validReadings: any[] = [];

    for (let i = 0; i < readings.length; i++) {
      const reading = readings[i];

      // Validate glucose range
      if (reading.glucoseMgDl < 20 || reading.glucoseMgDl > 400) {
        errors.push({ index: i, code: 'INVALID_GLUCOSE', message: 'Glucose must be between 20-400 mg/dL' });
        continue;
      }

      // Validate trend
      if (reading.trend !== undefined && (reading.trend < -3 || reading.trend > 3)) {
        errors.push({ index: i, code: 'INVALID_TREND', message: 'Trend must be between -3 and 3' });
        continue;
      }

      // Round timestamp to 5-min interval
      const readingTime = roundTo5Min(new Date(reading.time));

      validReadings.push({
        userId,
        time: readingTime,
        glucoseMgDl: reading.glucoseMgDl,
        trend: reading.trend,
        trendArrow: reading.trendArrow,
        isValid: true,
        source: reading.source,
        deviceTimestamp: reading.deviceTimestamp ? new Date(reading.deviceTimestamp) : null,
        clientId: request.headers['x-client-id'] as string,
      });
    }

    // Bulk upsert (on conflict, update)
    let accepted = 0;
    if (validReadings.length > 0) {
      // Use createMany with skipDuplicates for now
      // In production, use raw SQL for upsert
      for (const reading of validReadings) {
        try {
          await app.prisma.cGMReading.create({
            data: reading,
          });
          accepted++;
        } catch (err: any) {
          if (err.code === 'P2002') {
            // Duplicate - try update
            await app.prisma.cGMReading.updateMany({
              where: { userId: reading.userId, time: reading.time },
              data: reading,
            });
            accepted++;
          } else {
            throw err;
          }
        }
      }
    }

    // Invalidate CGM cache
    await app.cache.delPattern(`cgm:${userId}:*`);
    await app.cache.delPattern(`predictions:${userId}:*`);

    return reply.code(202).send({
      accepted,
      rejected: errors.length,
      errors,
    });
  });

  // Get latest CGM reading
  app.get('/latest', {
    schema: {
      response: { 200: z.object({
        time: z.string().datetime(),
        glucoseMgDl: z.number(),
        trend: z.number().nullable(),
        trendArrow: z.string().nullable(),
        isValid: z.boolean(),
        source: z.string(),
      }).nullable() },
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;

    const cacheKey = `cgm:latest:${userId}`;
    const cached = await app.cache.get(cacheKey);
    if (cached) return cached;

    const reading = await app.prisma.cGMReading.findFirst({
      where: { userId, isValid: true },
      orderBy: { time: 'desc' },
    });

    if (!reading) {
      return null;
    }

    const result = {
      time: reading.time.toISOString(),
      glucoseMgDl: reading.glucoseMgDl,
      trend: reading.trend,
      trendArrow: reading.trendArrow,
      isValid: reading.isValid,
      source: reading.source,
    };

    await app.cache.set(cacheKey, result, 30); // 30 seconds
    return result;
  });

  // Get CGM readings for time range
  app.get('/readings', {
    schema: {
      querystring: CGMReadingsQueryJsonSchema,
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;
    const { page, limit, sortBy, sortOrder, startTime, endTime, validOnly } = request.query as any;

    // Default window: last 24 hours when startTime is omitted
    const start = startTime
      ? new Date(startTime)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const where: any = {
      userId,
      time: { gte: start },
    };
    if (endTime) where.time.lte = new Date(endTime);
    if (validOnly) where.isValid = true;

    const [readings, total] = await Promise.all([
      app.prisma.cGMReading.findMany({
        where,
        orderBy: { [sortBy || 'time']: sortOrder || 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      app.prisma.cGMReading.count({ where }),
    ]);

    return {
      data: readings.map((r) => ({
        time: r.time.toISOString(),
        glucoseMgDl: r.glucoseMgDl,
        trend: r.trend,
        trendArrow: r.trendArrow,
        isValid: r.isValid,
        source: r.source,
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

  // Get AGP (Ambulatory Glucose Profile) data
  app.get('/agp', {
    schema: {
      querystring: CGMAgpQueryJsonSchema,
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;
    const { days } = request.query as any;

    const cacheKey = `cgm:agp:${userId}:${days}`;
    const cached = await app.cache.get(cacheKey);
    if (cached) return cached;

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    // Use raw query for better performance with TimescaleDB
    const stats = await app.prisma.$queryRaw`
      SELECT
        time_bucket('1 hour', time) AS hour_bucket,
        COUNT(*) AS reading_count,
        AVG(glucose_mg_dl)::int AS avg_glucose,
        MIN(glucose_mg_dl) AS min_glucose,
        MAX(glucose_mg_dl) AS max_glucose,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY glucose_mg_dl) AS p25,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY glucose_mg_dl) AS median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY glucose_mg_dl) AS p75,
        SUM(CASE WHEN glucose_mg_dl < 54 THEN 1 ELSE 0 END) AS very_low_count,
        SUM(CASE WHEN glucose_mg_dl < 70 THEN 1 ELSE 0 END) AS low_count,
        SUM(CASE WHEN glucose_mg_dl BETWEEN 70 AND 180 THEN 1 ELSE 0 END) AS in_range_count,
        SUM(CASE WHEN glucose_mg_dl > 180 THEN 1 ELSE 0 END) AS high_count,
        SUM(CASE WHEN glucose_mg_dl > 250 THEN 1 ELSE 0 END) AS very_high_count
      FROM cgm_readings
      WHERE user_id = ${userId}
        AND time >= ${startTime}
        AND time <= ${endTime}
        AND is_valid = true
      GROUP BY hour_bucket
      ORDER BY hour_bucket
    ` as any[];

    // Calculate overall stats
    const allReadings = await app.prisma.cGMReading.findMany({
      where: {
        userId,
        time: { gte: startTime, lte: endTime },
        isValid: true,
      },
      select: { glucoseMgDl: true },
    });

    const glucoseValues = allReadings.map((r) => r.glucoseMgDl).sort((a, b) => a - b);
    const total = glucoseValues.length;

    const percentiles = (p: number) => {
      if (total === 0) return 0;
      const idx = Math.floor(p / 100 * (total - 1));
      return glucoseValues[idx];
    };

    const veryLow = glucoseValues.filter((g) => g < 54).length;
    const low = glucoseValues.filter((g) => g < 70).length;
    const inRange = glucoseValues.filter((g) => g >= 70 && g <= 180).length;
    const high = glucoseValues.filter((g) => g > 180).length;
    const veryHigh = glucoseValues.filter((g) => g > 250).length;

    const result = {
      period: { days, startTime: startTime.toISOString(), endTime: endTime.toISOString() },
      summary: {
        totalReadings: total,
        avgGlucose: total > 0 ? Math.round(glucoseValues.reduce((a, b) => a + b, 0) / total) : 0,
        gmi: total > 0 ? Math.round((3.31 + 0.02392 * (glucoseValues.reduce((a, b) => a + b, 0) / total)) * 10) / 10 : 0,
        cv: total > 1 ? Math.round((stdDev(glucoseValues) / (glucoseValues.reduce((a, b) => a + b, 0) / total)) * 100 * 10) / 10 : 0,
        timeInRange: {
          veryLow: total > 0 ? Math.round((veryLow / total) * 1000) / 10 : 0,
          low: total > 0 ? Math.round((low / total) * 1000) / 10 : 0,
          inRange: total > 0 ? Math.round((inRange / total) * 1000) / 10 : 0,
          high: total > 0 ? Math.round((high / total) * 1000) / 10 : 0,
          veryHigh: total > 0 ? Math.round((veryHigh / total) * 1000) / 10 : 0,
        },
        percentiles: {
          p5: percentiles(5),
          p10: percentiles(10),
          p25: percentiles(25),
          p50: percentiles(50),
          p75: percentiles(75),
          p90: percentiles(90),
          p95: percentiles(95),
        },
      },
      hourly: stats.map((s) => ({
        hour: s.hour_bucket,
        avgGlucose: s.avg_glucose,
        minGlucose: s.min_glucose,
        maxGlucose: s.max_glucose,
        p25: s.p25,
        median: s.median,
        p75: s.p75,
        veryLowCount: Number(s.very_low_count),
        lowCount: Number(s.low_count),
        inRangeCount: Number(s.in_range_count),
        highCount: Number(s.high_count),
        veryHighCount: Number(s.very_high_count),
      })),
    };

    await app.cache.set(cacheKey, result, 300); // 5 minutes
    return result;
  });

  // Get glucose statistics for dashboard
  app.get('/stats', {
    schema: {
      querystring: CGMStatsQueryJsonSchema,
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;
    const { hours } = request.query as any;

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const readings = await app.prisma.cGMReading.findMany({
      where: {
        userId,
        time: { gte: startTime, lte: endTime },
        isValid: true,
      },
      orderBy: { time: 'asc' },
      select: { time: true, glucoseMgDl: true, trend: true, trendArrow: true },
    });

    if (readings.length === 0) {
      return {
        current: null,
        trend: null,
        trendArrow: null,
        stats: {
          avg: 0,
          avgGlucose: 0,
          gmi: 0,
          cv: 0,
          min: 0,
          max: 0,
          timeInRange: { veryLow: 0, low: 0, inRange: 0, high: 0, veryHigh: 0 },
        },
        series: [],
      };
    }

    const current = readings[readings.length - 1];
    const glucoseValues = readings.map((r) => r.glucoseMgDl);

    const veryLow = glucoseValues.filter((g) => g < 54).length;
    const low = glucoseValues.filter((g) => g < 70).length;
    const inRange = glucoseValues.filter((g) => g >= 70 && g <= 180).length;
    const high = glucoseValues.filter((g) => g > 180).length;
    const veryHigh = glucoseValues.filter((g) => g > 250).length;
    const total = glucoseValues.length;

    const avg = glucoseValues.reduce((a, b) => a + b, 0) / total;
    const sd = stdDev(glucoseValues);
    const gmi = 3.31 + 0.02392 * avg;
    const cv = avg > 0 ? (sd / avg) * 100 : 0;

    return {
      current: {
        time: current.time.toISOString(),
        glucoseMgDl: current.glucoseMgDl,
        trend: current.trend,
        trendArrow: current.trendArrow,
      },
      stats: {
        avg: Math.round(avg),
        avgGlucose: Math.round(avg),
        gmi: Math.round(gmi * 10) / 10,
        cv: Math.round(cv * 10) / 10,
        min: Math.min(...glucoseValues),
        max: Math.max(...glucoseValues),
        timeInRange: {
          veryLow: Math.round((veryLow / total) * 1000) / 10,
          low: Math.round((low / total) * 1000) / 10,
          inRange: Math.round((inRange / total) * 1000) / 10,
          high: Math.round((high / total) * 1000) / 10,
          veryHigh: Math.round((veryHigh / total) * 1000) / 10,
        },
      },
      series: readings.map((r) => ({
        time: r.time.toISOString(),
        glucose: r.glucoseMgDl,
        trend: r.trend,
        trendArrow: r.trendArrow,
      })),
    };
  });
};

function stdDev(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}