#!/usr/bin/env npx tsx
// Demo data seed - creates the fixed demo patient used by the dev auth
// fallback, plus 48h of CGM, meals, insulin and fresh hypo predictions.
// Run with: npx tsx scripts/seed-demo.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://t1d:t1d_dev_password@localhost:5432/t1d?schema=public',
    },
  },
});

const DEMO_USER_ID = process.env.DEMO_USER_ID || '00000000-0000-4000-8000-000000000001';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function trendArrow(trend: number): string {
  if (trend >= 3) return 'double_up';
  if (trend === 2) return 'single_up';
  if (trend === 1) return 'slight_up';
  if (trend === 0) return 'flat';
  if (trend === -1) return 'slight_down';
  if (trend === -2) return 'single_down';
  return 'double_down';
}

async function main() {
  console.log('🌱 Seeding demo data...');

  // ---------------------------------------------------------------- user
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      clerkId: 'demo',
      email: 'demo@t1d-india.app',
      role: 'PATIENT',
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
    },
  });
  console.log(`👤 Demo user: ${user.email}`);

  await prisma.patientProfile.upsert({
    where: { userId: user.id },
    update: { gender: 'female' },
    create: {
      userId: user.id,
      dateOfBirth: new Date('1998-04-12'),
      gender: 'female',
      heightCm: 162,
      weightKg: 55,
      diabetesType: 'T1D',
      diagnosisDate: new Date('2012-08-01'),
      hba1cLatest: 7.2,
      hba1cDate: new Date(Date.now() - 21 * 24 * 3600 * 1000),
      insulinRegimen: 'BASAL_BOLUS',
      icrGPerU: 15,
      isfMgDlPerU: 50,
      targetGlucoseMgDl: 110,
      basalRateUPerHr: 1.2,
      cgmType: 'DEXCOM_G6',
      hypoThresholdMgDl: 70,
      severeHypoThresholdMgDl: 54,
    },
  });

  // ---------------------------------------------------------------- cgm
  const now = new Date();
  now.setSeconds(0, 0);
  const rand = mulberry32(42);
  type Reading = { time: Date; glucoseMgDl: number; trend: number };
  const readings: Reading[] = [];

  // 48h of 5-min readings with meal peaks and one brief night dip.
  let glucose = 110;
  const meals: Array<{ minutesAgo: number; peak: number }> = [
    { minutesAgo: 2880 - 20, peak: 175 }, // yesterday dinner
    { minutesAgo: 2880 - 420, peak: 168 }, // yesterday breakfast
    { minutesAgo: 2880 - 585, peak: 180 },
    { minutesAgo: 2880 - 900, peak: 172 }, // today breakfast
    { minutesAgo: 2880 - 1080, peak: 165 },
    { minutesAgo: 2880 - 1335, peak: 185 }, // today lunch
    { minutesAgo: 2880 - 1815, peak: 190 }, // today dinner
    { minutesAgo: 2880 - 2160, peak: 160 }, // snack
    { minutesAgo: 2880 - 2400, peak: 118 }, // light evening snack
  ];

  for (let i = 2880; i >= 0; i -= 5) {
    const minutesAgo = 2880 - i;
    let target = 105 + Math.sin(minutesAgo / 240) * 12 + rand() * 8 - 4;

    for (const m of meals) {
      const dt = minutesAgo - m.minutesAgo;
      if (dt >= 0 && dt <= 150) {
        target += m.peak * Math.exp(-Math.pow((dt - 55) / 32, 2)) * 0.55;
      }
    }
    // brief dip ~7h ago
    if (minutesAgo >= 390 && minutesAgo <= 440) {
      target -= 55 * Math.exp(-Math.pow((minutesAgo - 415) / 12, 2));
    }
    // gentle downward drift over the last 60 minutes (pre-hypo scenario)
    if (minutesAgo <= 60) {
      target -= (60 - minutesAgo) * 0.35;
    }

    const next = Math.max(45, Math.min(260, target + (rand() - 0.5) * 10));
    readings.push({
      time: new Date(now.getTime() - minutesAgo * 60000),
      glucoseMgDl: Math.round(next),
      trend: Math.round(Math.max(-3, Math.min(3, (next - glucose) / 2))),
    });
    glucose = next;
  }

  // force a believable "falling" tail for the demo
  const tail = [124, 121, 118, 116, 113, 110, 108, 106, 104, 103, 102];
  tail.forEach((g, idx) => {
    const r = readings[readings.length - tail.length + idx];
    r.glucoseMgDl = g;
    r.trend = idx === 0 ? r.trend : Math.round((g - tail[idx - 1]) / 2);
  });
  const latest = readings[readings.length - 1];
  latest.glucoseMgDl = 102;
  latest.trend = -1;

  await prisma.cGMReading.deleteMany({ where: { userId: user.id } });
  await prisma.cGMReading.createMany({
    data: readings.map((r) => ({
      userId: user.id,
      time: r.time,
      glucoseMgDl: r.glucoseMgDl,
      trend: r.trend,
      trendArrow: trendArrow(r.trend),
      isValid: true,
      source: 'SIMULATED',
    })),
  });
  console.log(`📈 CGM readings: ${readings.length}`);

  // ---------------------------------------------------------------- meals
  const today = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600 * 1000);

  const mealsToCreate = [
    {
      hoursAgo: 11.5,
      mealType: 'BREAKFAST' as const,
      inputMethod: 'COMPOSITE_SELECT' as const,
      items: [
        { name: 'Poha (flattened rice)', quantityG: 200, carbsG: 42, proteinG: 6, fatG: 9, confidence: 0.95 },
        { name: 'Masala chai (with sugar)', quantityG: 150, carbsG: 14, proteinG: 3, fatG: 4, confidence: 0.9 },
      ],
      carbs: 56,
      protein: 9,
      fat: 13,
    },
    {
      hoursAgo: 6.5,
      mealType: 'LUNCH' as const,
      inputMethod: 'TEXT_SEARCH' as const,
      items: [
        { name: 'Wheat roti (chapati)', quantityG: 90, carbsG: 46, proteinG: 11, fatG: 7.5, confidence: 1 },
        { name: 'Dal tadka', quantityG: 200, carbsG: 24, proteinG: 12, fatG: 8, confidence: 0.95 },
        { name: 'Bhindi masala', quantityG: 150, carbsG: 12, proteinG: 3, fatG: 10, confidence: 0.9 },
      ],
      carbs: 82,
      protein: 26,
      fat: 25.5,
    },
    {
      hoursAgo: 3,
      mealType: 'DINNER' as const,
      inputMethod: 'PHOTO_ML' as const,
      items: [
        { name: 'Idli', quantityG: 180, carbsG: 52, proteinG: 9, fatG: 2, confidence: 0.92 },
        { name: 'Sambar', quantityG: 200, carbsG: 18, proteinG: 6, fatG: 5, confidence: 0.94 },
        { name: 'Coconut chutney', quantityG: 50, carbsG: 4, proteinG: 1, fatG: 9, confidence: 0.85 },
      ],
      carbs: 74,
      protein: 16,
      fat: 16,
    },
    {
      hoursAgo: 1.25,
      mealType: 'SNACK' as const,
      inputMethod: 'MANUAL' as const,
      items: [
        { name: 'Roasted chana', quantityG: 40, carbsG: 22, proteinG: 8, fatG: 4, confidence: 1 },
        { name: 'Buttermilk (chaas)', quantityG: 200, carbsG: 6, proteinG: 2, fatG: 2, confidence: 0.9 },
      ],
      carbs: 28,
      protein: 10,
      fat: 6,
    },
  ];

  await prisma.insulinLog.deleteMany({ where: { userId: user.id } });
  await prisma.mealLog.deleteMany({ where: { userId: user.id } });

  for (const m of mealsToCreate) {
    const mealTime = today(m.hoursAgo);
    const meal = await prisma.mealLog.create({
      data: {
        userId: user.id,
        mealTime,
        loggedAt: mealTime,
        mealType: m.mealType,
        inputMethod: m.inputMethod,
        items: m.items as any,
        totalCarbsG: m.carbs,
        totalProteinG: m.protein,
        totalFatG: m.fat,
        totalFiberG: Math.round((m.carbs * 0.06 + Number.EPSILON) * 10) / 10,
        locationType: 'HOME',
      },
    });

    // matching bolus dose (ICR 15 g/U)
    const doseU = Math.round((m.carbs / 15) * 10) / 10;
    const readingNearMeal =
      readings.find((r) => r.time <= mealTime) ?? latest;

    await prisma.insulinLog.create({
      data: {
        userId: user.id,
        loggedAt: mealTime,
        administeredAt: new Date(mealTime.getTime() - 5 * 60000),
        insulinType: 'RAPID_ASPART',
        doseU,
        injectionSite: 'ABDOMEN',
        relatedMealLogId: meal.id,
        glucoseAtInjection: readingNearMeal.glucoseMgDl,
        carbEstimateG: m.carbs,
        calculatorRecommendedU: doseU,
        deliveryMethod: 'PEN',
      },
    });
  }

  // nightly basal dose
  await prisma.insulinLog.create({
    data: {
      userId: user.id,
      loggedAt: today(15),
      administeredAt: today(15),
      insulinType: 'GLARGINE_U100',
      doseU: 12,
      injectionSite: 'THIGH',
      deliveryMethod: 'PEN',
    },
  });
  console.log(`🍽️  Meals: ${mealsToCreate.length}, insulin logs: ${mealsToCreate.length + 1}`);

  // ---------------------------------------------------------------- predictions
  const features = (delta: number) => [
    { feature: 'glucose_slope_15min', contribution: -delta },
    { feature: 'last_iob', contribution: 0.18 },
    { feature: 'carbs_last_90min', contribution: 0.09 },
    { feature: 'time_of_day', contribution: 0.05 },
  ];

  await prisma.hypoPrediction.deleteMany({ where: { userId: user.id } });
  await prisma.hypoPrediction.createMany({
    data: [
      {
        userId: user.id,
        predictedAt: new Date(now.getTime() - 4 * 60000),
        predictionHorizonMin: 30,
        glucoseP10: 68,
        glucoseP50: 85,
        glucoseP90: 103,
        hypoProbability: 0.44,
        severeHypoProbability: 0.06,
        topFeatures: features(0.31) as any,
        modelVersion: 'tft-v1.2.0-demo',
      },
      {
        userId: user.id,
        predictedAt: new Date(now.getTime() - 4 * 60000),
        predictionHorizonMin: 60,
        glucoseP10: 74,
        glucoseP50: 91,
        glucoseP90: 109,
        hypoProbability: 0.28,
        severeHypoProbability: 0.03,
        topFeatures: features(0.19) as any,
        modelVersion: 'tft-v1.2.0-demo',
      },
    ],
  });
  console.log('🤖 Hypo predictions: 2 (30/60 min horizons)');

  // ---------------------------------------------------------------- alerts
  await prisma.hypoAlert.deleteMany({ where: { userId: user.id } });
  await prisma.hypoAlert.create({
    data: {
      userId: user.id,
      predictionId: (
        await prisma.hypoPrediction.findFirst({
          where: { userId: user.id, predictionHorizonMin: 30 },
        })
      )!.id,
      alertLevel: 'WARNING',
      message: 'Glucose may drop below 70 mg/dL in about 30 minutes',
      recommendedAction: 'Eat 15-20g fast carbs and recheck in 15 minutes',
      indianCarbOptions: [
        { item: 'Glucose tablets', qty: '3-4 tabs', carbsG: 12 },
        { item: 'Fruit juice', qty: '150ml', carbsG: 15 },
        { item: 'Banana', qty: '1 small', carbsG: 18 },
      ] as any,
      triggeredAt: new Date(now.getTime() - 3 * 60000),
    },
  });
  console.log('🔔 Hypo alert: 1 (WARNING)');

  console.log('✅ Demo seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
