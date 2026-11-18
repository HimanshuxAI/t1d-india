// JWT Authentication Plugin

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config';
import { UserRole } from '@t1d-india/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      clerkId: string;
      email: string;
      role: UserRole;
    };
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  // Register JWT
  await app.register(import('@fastify/jwt'), {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
    verify: {
      algorithms: ['HS256'],
    },
  });

  // Decorate request with user
  app.decorateRequest('user', null);

  // Authentication hook
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for public routes
    const publicPaths = [
      '/health',
      '/ready',
      '/api/v1/auth/',
      '/api/v1/webhooks/',
      '/documentation',
      '/documentation/',
    ];

    if (publicPaths.some((p) => request.url.startsWith(p))) {
      return;
    }

    try {
      await request.jwtVerify();
      request.user = request.user as FastifyRequest['user'];
    } catch (err) {
      // Token invalid or expired
      if (err.code === 'FAST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing token',
        code: 'INVALID_TOKEN',
      });
    }
  });

  // Role-based access control
  app.decorate('requireRole', (...roles: UserRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      if (!roles.includes(request.user.role)) {
        return reply.code(403).send({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }
    };
  });
};

export default fp(authPlugin);