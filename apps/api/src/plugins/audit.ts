// Audit Logging Plugin

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    auditLog: (data: AuditLogData) => Promise<void>;
  }
}

interface AuditLogData {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  status: 'success' | 'failure';
  durationMs: number;
  metadata?: Record<string, unknown>;
}

const auditPlugin: FastifyPluginAsync = async (app) => {
  // Audit log function
  const auditLog = async (data: AuditLogData) => {
    try {
      await app.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          ip: data.metadata?.ip as string,
          userAgent: data.metadata?.userAgent as string,
          method: data.metadata?.method as string,
          path: data.metadata?.path as string,
          status: data.status,
          durationMs: data.durationMs,
          metadata: data.metadata,
        },
      });
    } catch (err) {
      // Don't fail the request if audit logging fails
      app.log.error({ err, data }, 'Audit log failed');
    }
  };

  app.decorate('auditLog', auditLog);

  // Global audit hook
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const durationMs = Date.now() - (request.startTime || Date.now());

    // Skip audit for health checks and static assets
    if (request.url.startsWith('/health') || request.url.startsWith('/ready')) {
      return;
    }

    // Determine action from method + path
    const action = `${request.method}:${request.routerPath || request.url}`;
    const resourceType = request.routerPath?.split('/')[2] || 'unknown';
    const resourceId = request.params?.['id'] as string | undefined;

    await auditLog({
      userId: request.user?.id,
      action,
      resourceType,
      resourceId,
      status: reply.statusCode < 400 ? 'success' : 'failure',
      durationMs,
      metadata: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
      },
    });
  });
};

export default fp(auditPlugin);