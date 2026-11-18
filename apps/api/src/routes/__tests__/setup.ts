// Vitest Setup File

import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Global test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:test@localhost:5432/t1d_test',
    },
  },
});

// Make prisma available globally
(globalThis as any).prisma = prisma;

beforeAll(async () => {
  // Clean up test database
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Extend matchers if needed
expect.extend({
  toBeCloseToPercent(received: number, expected: number, precision = 1) {
    const diff = Math.abs(received - expected);
    const pass = diff <= precision;
    return {
      pass,
      message: () =>
        `expected ${received} to be within ${precision}% of ${expected}`,
    };
  },
});

declare global {
  namespace Vi {
    interface Jest {
      toBeCloseToPercent(received: number, expected: number, precision?: number): any;
    }
  }
}