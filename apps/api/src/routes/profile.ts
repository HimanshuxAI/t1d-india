// Patient Profile Routes

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PatientProfileSchema, AppError, ERROR_CODES, UserRole } from '@t1d-india/shared';
import argon2 from 'argon2';

const PatientProfileJsonSchema = zodToJsonSchema(PatientProfileSchema, {
  target: 'jsonSchema7',
  name: 'PatientProfile',
});
const PatientProfileUpdateJsonSchema = zodToJsonSchema(PatientProfileSchema.partial(), {
  target: 'jsonSchema7',
  name: 'PatientProfileUpdate',
});
const PreferencesUpdateJsonSchema = zodToJsonSchema(
  z.object({
    hypoThresholdMgDl: z.number().int().min(50).max(100).optional(),
    severeHypoThresholdMgDl: z.number().int().min(40).max(80).optional(),
    alertSoundEnabled: z.boolean().optional(),
    caregiverShareEnabled: z.boolean().optional(),
    dataSharingConsent: z.boolean().optional(),
    researchConsent: z.boolean().optional(),
    marketingConsent: z.boolean().optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
  }),
  { target: 'jsonSchema7', name: 'PreferencesUpdate' }
);

export const profileRoutes: FastifyPluginAsync = async (app) => {
  // Get current user's profile
  app.get('/', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER', 'CLINICIAN'),
  }, async (request) => {
    const userId = request.user!.id;

    const profile = await app.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    return {
      dateOfBirth: profile.dateOfBirth.toISOString().split('T')[0],
      gender: profile.gender,
      heightCm: profile.heightCm ? Number(profile.heightCm) : undefined,
      weightKg: profile.weightKg ? Number(profile.weightKg) : undefined,
      diabetesType: profile.diabetesType,
      diagnosisDate: profile.diagnosisDate?.toISOString().split('T')[0],
      hba1cLatest: profile.hba1cLatest ? Number(profile.hba1cLatest) : undefined,
      hba1cDate: profile.hba1cDate?.toISOString().split('T')[0],
      insulinRegimen: profile.insulinRegimen,
      icrGPerU: profile.icrGPerU ? Number(profile.icrGPerU) : undefined,
      isfMgDlPerU: profile.isfMgDlPerU ? Number(profile.isfMgDlPerU) : undefined,
      targetGlucoseMgDl: profile.targetGlucoseMgDl,
      basalRateUPerHr: profile.basalRateUPerHr ? Number(profile.basalRateUPerHr) : undefined,
      nphMorningU: profile.nphMorningU ? Number(profile.nphMorningU) : undefined,
      nphEveningU: profile.nphEveningU ? Number(profile.nphEveningU) : undefined,
      regularBreakfastU: profile.regularBreakfastU ? Number(profile.regularBreakfastU) : undefined,
      regularLunchU: profile.regularLunchU ? Number(profile.regularLunchU) : undefined,
      regularDinnerU: profile.regularDinnerU ? Number(profile.regularDinnerU) : undefined,
      cgmType: profile.cgmType,
      cgmSerialHash: profile.cgmSerialHash,
      pumpType: profile.pumpType,
      hypoThresholdMgDl: profile.hypoThresholdMgDl,
      severeHypoThresholdMgDl: profile.severeHypoThresholdMgDl,
      alertSoundEnabled: profile.alertSoundEnabled,
      caregiverShareEnabled: profile.caregiverShareEnabled,
      dataSharingConsent: profile.dataSharingConsent,
      researchConsent: profile.researchConsent,
      marketingConsent: profile.marketingConsent,
      updatedAt: profile.updatedAt.toISOString(),
    };
  });

  // Create or update profile
  app.put('/', {
    schema: {
      body: PatientProfileJsonSchema,
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const userId = request.user!.id;
    const input = request.body as z.infer<typeof PatientProfileSchema>;

    // Validate age (must be at least 1 year old)
    const dob = new Date(input.dateOfBirth);
    const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 1) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Patient must be at least 1 year old', 400);
    }

    // Validate diagnosis date not in future
    if (input.diagnosisDate) {
      const diagDate = new Date(input.diagnosisDate);
      if (diagDate > new Date()) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Diagnosis date cannot be in the future', 400);
      }
      if (diagDate < dob) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Diagnosis date cannot be before birth date', 400);
      }
    }

    // Validate HbA1c date not in future
    if (input.hba1cDate) {
      const hba1cDate = new Date(input.hba1cDate);
      if (hba1cDate > new Date()) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'HbA1c date cannot be in the future', 400);
      }
    }

    // Upsert profile
    const profile = await app.prisma.patientProfile.upsert({
      where: { userId },
      create: {
        userId,
        dateOfBirth: dob,
        gender: input.gender,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        diabetesType: input.diabetesType,
        diagnosisDate: input.diagnosisDate ? new Date(input.diagnosisDate) : null,
        hba1cLatest: input.hba1cLatest,
        hba1cDate: input.hba1cDate ? new Date(input.hba1cDate) : null,
        insulinRegimen: input.insulinRegimen,
        icrGPerU: input.icrGPerU,
        isfMgDlPerU: input.isfMgDlPerU,
        targetGlucoseMgDl: input.targetGlucoseMgDl,
        basalRateUPerHr: input.basalRateUPerHr,
        nphMorningU: input.nphMorningU,
        nphEveningU: input.nphEveningU,
        regularBreakfastU: input.regularBreakfastU,
        regularLunchU: input.regularLunchU,
        regularDinnerU: input.regularDinnerU,
        cgmType: input.cgmType,
        cgmSerialHash: input.cgmSerialHash,
        pumpType: input.pumpType,
        hypoThresholdMgDl: input.hypoThresholdMgDl,
        severeHypoThresholdMgDl: input.severeHypoThresholdMgDl,
        alertSoundEnabled: input.alertSoundEnabled,
        caregiverShareEnabled: input.caregiverShareEnabled,
        dataSharingConsent: input.dataSharingConsent,
        researchConsent: input.researchConsent,
        marketingConsent: input.marketingConsent,
      },
      update: {
        dateOfBirth: dob,
        gender: input.gender,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        diabetesType: input.diabetesType,
        diagnosisDate: input.diagnosisDate ? new Date(input.diagnosisDate) : null,
        hba1cLatest: input.hba1cLatest,
        hba1cDate: input.hba1cDate ? new Date(input.hba1cDate) : null,
        insulinRegimen: input.insulinRegimen,
        icrGPerU: input.icrGPerU,
        isfMgDlPerU: input.isfMgDlPerU,
        targetGlucoseMgDl: input.targetGlucoseMgDl,
        basalRateUPerHr: input.basalRateUPerHr,
        nphMorningU: input.nphMorningU,
        nphEveningU: input.nphEveningU,
        regularBreakfastU: input.regularBreakfastU,
        regularLunchU: input.regularLunchU,
        regularDinnerU: input.regularDinnerU,
        cgmType: input.cgmType,
        cgmSerialHash: input.cgmSerialHash,
        pumpType: input.pumpType,
        hypoThresholdMgDl: input.hypoThresholdMgDl,
        severeHypoThresholdMgDl: input.severeHypoThresholdMgDl,
        alertSoundEnabled: input.alertSoundEnabled,
        caregiverShareEnabled: input.caregiverShareEnabled,
        dataSharingConsent: input.dataSharingConsent,
        researchConsent: input.researchConsent,
        marketingConsent: input.marketingConsent,
      },
    });

    // Invalidate cache
    await app.cache.delPattern(`profile:${userId}:*`);

    return reply.code(201).send({
      message: 'Profile saved successfully',
      updatedAt: profile.updatedAt.toISOString(),
    });
  });

  // Update preferences only
  app.patch('/preferences', {
    schema: {
      body: PreferencesUpdateJsonSchema,
    },
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request) => {
    const userId = request.user!.id;
    const input = request.body as any;

    // Update user preferences
    if (input.locale || input.timezone) {
      await app.prisma.user.update({
        where: { id: userId },
        data: {
          locale: input.locale,
          timezone: input.timezone,
        },
      });
    }

    // Update profile preferences
    const profileUpdate: any = {};
    if (input.hypoThresholdMgDl !== undefined) profileUpdate.hypoThresholdMgDl = input.hypoThresholdMgDl;
    if (input.severeHypoThresholdMgDl !== undefined) profileUpdate.severeHypoThresholdMgDl = input.severeHypoThresholdMgDl;
    if (input.alertSoundEnabled !== undefined) profileUpdate.alertSoundEnabled = input.alertSoundEnabled;
    if (input.caregiverShareEnabled !== undefined) profileUpdate.caregiverShareEnabled = input.caregiverShareEnabled;
    if (input.dataSharingConsent !== undefined) profileUpdate.dataSharingConsent = input.dataSharingConsent;
    if (input.researchConsent !== undefined) profileUpdate.researchConsent = input.researchConsent;
    if (input.marketingConsent !== undefined) profileUpdate.marketingConsent = input.marketingConsent;

    if (Object.keys(profileUpdate).length > 0) {
      await app.prisma.patientProfile.update({
        where: { userId },
        data: profileUpdate,
      });
    }

    await app.cache.delPattern(`profile:${userId}:*`);

    return { message: 'Preferences updated' };
  });

  // Delete account (GDPR/DPDP compliance)
  app.delete('/account', {
    preHandler: app.requireRole('PATIENT'),
  }, async (request, reply) => {
    const userId = request.user!.id;

    // Soft delete - anonymize data
    await app.prisma.$transaction(async (tx) => {
      // Anonymize user
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@example.com`,
          clerkId: `deleted_${userId}`,
          deletedAt: new Date(),
        },
      });

      // Anonymize profile
      await tx.patientProfile.update({
        where: { userId },
        data: {
          dateOfBirth: new Date('1900-01-01'),
          gender: 'other',
          heightCm: null,
          weightKg: null,
        },
      });

      // Optionally: delete or anonymize logs based on consent
      // For now, keep logs for research if consented
    });

    // Clear cookies
    reply.clearCookie('refreshToken');

    return { message: 'Account deleted. Data anonymized per privacy policy.' };
  });

  // Export user data (GDPR/DPDP right to portability)
  app.get('/export', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request) => {
    const userId = request.user!.id;

    const [user, profile, meals, insulin, cgm, predictions, alerts] = await Promise.all([
      app.prisma.user.findUnique({ where: { id: userId } }),
      app.prisma.patientProfile.findUnique({ where: { userId } }),
      app.prisma.mealLog.findMany({ where: { userId }, orderBy: { mealTime: 'desc' } }),
      app.prisma.insulinLog.findMany({ where: { userId }, orderBy: { administeredAt: 'desc' } }),
      app.prisma.cGMReading.findMany({ where: { userId, isValid: true }, orderBy: { time: 'desc' }, take: 10000 }),
      app.prisma.hypoPrediction.findMany({ where: { userId }, orderBy: { predictedAt: 'desc' } }),
      app.prisma.hypoAlert.findMany({ where: { userId }, orderBy: { triggeredAt: 'desc' } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        locale: user.locale,
        timezone: user.timezone,
        createdAt: user.createdAt.toISOString(),
      } : null,
      profile: profile ? {
        ...profile,
        dateOfBirth: profile.dateOfBirth.toISOString().split('T')[0],
        diagnosisDate: profile.diagnosisDate?.toISOString().split('T')[0],
        hba1cDate: profile.hba1cDate?.toISOString().split('T')[0],
      } : null,
      mealLogs: meals.map((m) => ({
        ...m,
        mealTime: m.mealTime.toISOString(),
        totalCarbsG: Number(m.totalCarbsG),
        totalProteinG: m.totalProteinG ? Number(m.totalProteinG) : undefined,
        totalFatG: m.totalFatG ? Number(m.totalFatG) : undefined,
        totalFiberG: m.totalFiberG ? Number(m.totalFiberG) : undefined,
        loggedAt: m.loggedAt.toISOString(),
      })),
      insulinLogs: insulin.map((i) => ({
        ...i,
        administeredAt: i.administeredAt.toISOString(),
        doseU: Number(i.doseU),
        carbEstimateG: i.carbEstimateG ? Number(i.carbEstimateG) : undefined,
        calculatorRecommendedU: i.calculatorRecommendedU ? Number(i.calculatorRecommendedU) : undefined,
        loggedAt: i.loggedAt.toISOString(),
      })),
      cgmReadings: cgm.map((c) => ({
        time: c.time.toISOString(),
        glucoseMgDl: c.glucoseMgDl,
        trend: c.trend,
        trendArrow: c.trendArrow,
        source: c.source,
      })),
      hypoPredictions: predictions.map((p) => ({
        ...p,
        predictedAt: p.predictedAt.toISOString(),
        hypoProbability: Number(p.hypoProbability),
        severeHypoProbability: Number(p.severeHypoProbability),
      })),
      hypoAlerts: alerts.map((a) => ({
        ...a,
        triggeredAt: a.triggeredAt.toISOString(),
      })),
    };
  });
};