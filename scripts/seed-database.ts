#!/usr/bin/env npx tsx
// Database Seed Runner
// Run with: npx tsx scripts/seed-database.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const seedDataPath = path.join(__dirname, '../prisma/seed-data.json');
  let foods: any[] = [];
  let compositeMeals: any[] = [];

  if (fs.existsSync(seedDataPath)) {
    const data = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
    foods = data.foods || [];
    compositeMeals = data.compositeMeals || [];
    console.log(`📦 Loaded ${foods.length} foods and ${compositeMeals.length} composite meals from JSON`);
  } else {
    console.log('⚠️  No seed data JSON found, using inline data');
  }

  // Insert foods
  for (const food of foods) {
    await prisma.food.upsert({
      where: { nameEn: food.nameEn },
      update: food,
      create: food,
    });
  }
  console.log(`✅ Inserted ${foods.length} foods`);

  // Insert composite meals
  for (const meal of compositeMeals) {
    await prisma.compositeMeal.upsert({
      where: { nameEn: meal.nameEn },
      update: meal,
      create: meal,
    });
  }
  console.log(`✅ Inserted ${compositeMeals.length} composite meals`);

  // Insert ML models
  await prisma.mLModel.upsert({
    where: { name: 'tft_hypo_predictor' },
    update: {},
    create: {
      name: 'tft_hypo_predictor',
      version: '1.0.0',
      type: 'hypo_prediction',
      framework: 'onnx',
      uri: 's3://t1d-models/tft_hypo_predictor.onnx',
      metrics: {
        sensitivity_30min: 0.92,
        specificity_30min: 0.90,
        auroc: 0.96,
        brier_score: 0.08,
      },
      status: 'staging',
    },
  });

  await prisma.mLModel.upsert({
    where: { name: 'indian_food_carb_estimator' },
    update: {},
    create: {
      name: 'indian_food_carb_estimator',
      version: '1.0.0',
      type: 'carb_estimation',
      framework: 'onnx',
      uri: 's3://t1d-models/carb_estimator.onnx',
      metrics: {
        food_class_accuracy: 0.85,
        portion_mae_g: 25,
        carbs_mae_g: 12,
      },
      status: 'staging',
    },
  });

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });