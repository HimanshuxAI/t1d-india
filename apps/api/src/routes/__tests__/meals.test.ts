// Meal Routes Integration Tests

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../test-utils/app';
import { PrismaClient } from '@prisma/client';

describe('Meal Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  const testUserId = 'test-user-id';
  const authToken = 'test-token';

  beforeAll(async () => {
    app = await buildApp();
    prisma = new PrismaClient();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.mealLog.deleteMany({ where: { userId: testUserId } });
    await prisma.food.deleteMany({ where: { nameEn: { startsWith: 'Test' } } });
  });

  describe('POST /api/v1/meals', () => {
    it('should create a meal log with composite Indian meal', async () => {
      // Create test foods
      const rice = await prisma.food.create({
        data: {
          nameEn: 'Test Basmati Rice',
          nameHi: 'टेस्ट बासमती चावल',
          category: 'cereal',
          carbsG: 28.0,
          proteinG: 2.7,
          fatG: 0.3,
          typicalServingG: 150,
          source: 'test',
          confidenceScore: 0.9,
        },
      });

      const rajma = await prisma.food.create({
        data: {
          nameEn: 'Test Rajma',
          nameHi: 'टेस्ट राजमा',
          category: 'pulse',
          carbsG: 22.0,
          proteinG: 8.7,
          fatG: 0.5,
          typicalServingG: 150,
          source: 'test',
          confidenceScore: 0.9,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/meals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          mealTime: new Date().toISOString(),
          mealType: 'LUNCH',
          items: [
            { foodId: rice.id, quantityG: 200, prepMethod: 'steamed' },
            { foodId: rajma.id, quantityG: 150, prepMethod: 'pressure_cooked' },
          ],
          inputMethod: 'TEXT_SEARCH',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.totalCarbsG).toBeCloseTo(89, 0); // 56 + 33
      expect(body.absorptionProfile).toBeDefined();
      expect(body.absorptionProfile.phases).toHaveLength(3);
    });

    it('should reject meal with invalid food ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/meals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          mealTime: new Date().toISOString(),
          mealType: 'LUNCH',
          items: [
            { foodId: '00000000-0000-0000-0000-000000000000', quantityG: 100 },
          ],
          inputMethod: 'TEXT_SEARCH',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should calculate absorption profile for north Indian lunch', async () => {
      const rice = await prisma.food.create({
        data: {
          nameEn: 'Test Rice',
          category: 'cereal',
          carbsG: 28.0,
          proteinG: 2.7,
          fatG: 0.3,
          typicalServingG: 150,
          source: 'test',
          confidenceScore: 0.9,
        },
      });

      const dal = await prisma.food.create({
        data: {
          nameEn: 'Test Dal',
          category: 'pulse',
          carbsG: 20.0,
          proteinG: 8.0,
          fatG: 0.5,
          typicalServingG: 100,
          source: 'test',
          confidenceScore: 0.9,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/meals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          mealTime: new Date().toISOString(),
          mealType: 'LUNCH',
          items: [
            { foodId: rice.id, quantityG: 200 },
            { foodId: dal.id, quantityG: 100 },
          ],
          inputMethod: 'COMPOSITE_SELECT',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.absorptionProfile.phases).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'rapid' }),
          expect.objectContaining({ name: 'intermediate' }),
          expect.objectContaining({ name: 'slow' }),
        ])
      );
    });
  });

  describe('GET /api/v1/meals', () => {
    it('should return paginated meal logs', async () => {
      // Create test meals
      for (let i = 0; i < 5; i++) {
        await prisma.mealLog.create({
          data: {
            userId: testUserId,
            mealTime: new Date(Date.now() - i * 3600000),
            mealType: 'LUNCH',
            inputMethod: 'TEXT_SEARCH',
            items: [],
            totalCarbsG: 50 + i * 10,
          },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/meals?page=1&limit=2',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(5);
      expect(body.pagination.totalPages).toBe(3);
    });
  });
});