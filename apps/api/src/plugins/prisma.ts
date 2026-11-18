// Prisma Client Plugin for Fastify

import { PrismaClient } from '@prisma/client';
import { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (app) => {
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

  // Connect on startup
  await prisma.$connect();

  // Decorate fastify instance
  app.decorate('prisma', prisma);

  // Graceful shutdown
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export default prismaPlugin;