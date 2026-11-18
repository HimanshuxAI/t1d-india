// Test Utilities for API Integration Tests

import Fastify, { FastifyInstance } from 'fastify';
import { config } from 'dotenv';
config({ path: '.env.test' });

let testApp: FastifyInstance | null = null;

export async function buildApp(): Promise<FastifyInstance> {
  if (testApp) return testApp;

  const app = Fastify({
    logger: false,
  });

  // Register plugins (simplified for testing)
  await app.register(import('@fastify/cors'));
  await app.register(import('@fastify/sensible'));

  // Mock auth
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer test-token')) {
      request.user = {
        id: 'test-user-id',
        clerkId: 'test-clerk-id',
        email: 'test@example.com',
        role: 'PATIENT',
      };
    }
  });

  // Register routes
  const { registerRoutes } = await import('../index');
  await registerRoutes(app);

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message,
    });
  });

  testApp = app;
  return app;
}

export async function closeApp(): Promise<void> {
  if (testApp) {
    await testApp.close();
    testApp = null;
  }
}