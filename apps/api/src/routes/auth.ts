// Authentication Routes

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError, ERROR_CODES } from '@t1d-india/shared';

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Clerk webhook for user sync
  app.post('/webhooks/clerk', async (request, reply) => {
    const payload = request.body as {
      type: string;
      data: {
        id: string;
        email_addresses: Array<{ email_address: string }>;
        phone_numbers?: Array<{ phone_number: string }>;
        public_metadata?: Record<string, unknown>;
      };
    };

    // Verify webhook signature (in production)
    // const svix_id = request.headers['svix-id'];
    // const svix_timestamp = request.headers['svix-timestamp'];
    // const svix_signature = request.headers['svix-signature'];
    // Verify with CLERK_WEBHOOK_SECRET

    if (payload.type === 'user.created' || payload.type === 'user.updated') {
      const { id, email_addresses, phone_numbers, public_metadata } = payload.data;
      const email = email_addresses[0]?.email_address;
      const phone = phone_numbers?.[0]?.phone_number;

      if (!email) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Email required', 400);
      }

      // Upsert user
      await app.prisma.user.upsert({
        where: { clerkId: id },
        create: {
          clerkId: id,
          email,
          phoneHash: phone ? hashPhone(phone) : null,
          role: (public_metadata?.role as string) || 'PATIENT',
        },
        update: {
          email,
          phoneHash: phone ? hashPhone(phone) : null,
          role: (public_metadata?.role as string) || 'PATIENT',
        },
      });

      return { success: true };
    }

    if (payload.type === 'user.deleted') {
      await app.prisma.user.update({
        where: { clerkId: payload.data.id },
        data: { deletedAt: new Date() },
      });
      return { success: true };
    }

    return { success: true };
  });

  // Get current user profile
  app.get('/me', async (request) => {
    const user = await app.prisma.user.findUnique({
      where: { id: request.user!.id },
      include: { profile: true },
    });

    if (!user) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      locale: user.locale,
      timezone: user.timezone,
      profile: user.profile,
    };
  });

  // Refresh token
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Refresh token required', 401);
    }

    try {
      const decoded = await app.jwt.verify<{ id: string }>(refreshToken);
      const user = await app.prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || user.deletedAt) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED, 'User not found', 401);
      }

      const accessToken = app.jwt.sign({ id: user.id, role: user.role });
      const newRefreshToken = app.jwt.sign({ id: user.id }, { expiresIn: '7d' });

      reply.setCookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return { accessToken };
    } catch {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid refresh token', 401);
    }
  });

  // Logout
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('refreshToken');
    return { success: true };
  });
};

// Simple phone hashing (in production, use proper crypto)
function hashPhone(phone: string): string {
  let hash = 0;
  for (let i = 0; i < phone.length; i++) {
    hash = ((hash << 5) - hash) + phone.charCodeAt(i);
    hash |= 0;
  }
  return `phone_${Math.abs(hash).toString(36)}`;
}