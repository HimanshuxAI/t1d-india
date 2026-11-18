// T1D India API - Main Entry Point

import Fastify, { FastifyInstance } from 'fastify';
import { env } from './config';
import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import auditPlugin from './plugins/audit';
import { errorHandler, notFoundHandler } from './plugins/error-handler';
import { registerRoutes } from './routes';

// Create Fastify instance
const app: FastifyInstance = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: 'array',
    },
  },
});

// Register plugins
async function registerPlugins() {
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);
  await app.register(auditPlugin);

  // CORS
  await app.register(import('@fastify/cors'), {
    origin: env.NODE_ENV === 'production'
      ? ['https://app.t1d-india.example.com', 'https://clinician.t1d-india.example.com']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Helmet (security headers)
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  // Sensible (adds common utilities)
  await app.register(import('@fastify/sensible'));

  // Rate limiting
  await app.register(import('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    skipOnError: true,
  });

  // Swagger/OpenAPI
  if (env.ENABLE_SWAGGER) {
    await app.register(import('@fastify/swagger'), {
      openapi: {
        info: {
          title: 'T1D India API',
          description: 'AI-Powered Hypoglycemia Prediction and Carb-Counting for Indian T1D Diets',
          version: '0.0.1',
          contact: {
            name: 'T1D India Team',
            email: 'api@t1d-india.example.com',
          },
        },
        servers: [
          { url: `http://localhost:${env.PORT}`, description: 'Development' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    });

    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/documentation',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // Multipart for file uploads
  await app.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });
}

// Register routes
async function registerAppRoutes() {
  await registerRoutes(app);
}

// Health checks
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '0.0.1',
}));

app.get('/ready', async () => {
  // Check database connectivity
  try {
    await app.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready', checks: { database: 'ok' } };
  } catch {
    return { status: 'not ready', checks: { database: 'failed' } };
  }
});

// Error handlers
app.setErrorHandler(errorHandler);
app.setNotFoundHandler(notFoundHandler);

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutting down...');
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function main() {
  try {
    await registerPlugins();
    await registerAppRoutes();

    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server listening on ${env.HOST}:${env.PORT}`);

    if (env.ENABLE_SWAGGER) {
      app.log.info(`Swagger UI available at http://${env.HOST}:${env.PORT}/documentation`);
    }
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();

export { app };