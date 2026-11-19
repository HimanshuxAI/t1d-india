// API Configuration

import { config } from 'dotenv';
import { resolve } from 'path';

// Load apps/api/.env if present, then the monorepo root .env.
config({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
});

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  // Fixed demo patient id used by the dev auth fallback and demo seed
  DEMO_USER_ID: process.env.DEMO_USER_ID || '00000000-0000-4000-8000-000000000001',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Clerk/Auth
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',

  // CGM APIs
  DEXCOM_CLIENT_ID: process.env.DEXCOM_CLIENT_ID || '',
  DEXCOM_CLIENT_SECRET: process.env.DEXCOM_CLIENT_SECRET || '',
  DEXCOM_REDIRECT_URI: process.env.DEXCOM_REDIRECT_URI || '',
  LIBRE_CLIENT_ID: process.env.LIBRE_CLIENT_ID || '',
  LIBRE_CLIENT_SECRET: process.env.LIBRE_CLIENT_SECRET || '',

  // ML Service
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  ML_SERVICE_API_KEY: process.env.ML_SERVICE_API_KEY || '',

  // S3/MinIO
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',
  S3_BUCKET_MODELS: process.env.S3_BUCKET_MODELS || 't1d-models',
  S3_BUCKET_PHOTOS: process.env.S3_BUCKET_PHOTOS || 't1d-meal-photos',
  S3_REGION: process.env.S3_REGION || 'ap-south-1',

  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  GRAFANA_API_KEY: process.env.GRAFANA_API_KEY || '',

  // Feature Flags
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER !== 'false',
  ENABLE_METRICS: process.env.ENABLE_METRICS !== 'false',
} as const;

// Validate required env vars in production
if (env.NODE_ENV === 'production') {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CLERK_SECRET_KEY',
  ];

  for (const key of required) {
    if (!env[key as keyof typeof env]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Ensure JWT secret is strong enough
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}