// Global Error Handler

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ERROR_CODES,
} from '@t1d-india/shared';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.id;
  const statusCode = error.statusCode || 500;

  // Log error
  request.log.error(
    {
      err: error,
      requestId,
      url: request.url,
      method: request.method,
      userId: request.user?.id,
    },
    'Request error'
  );

  // Handle known error types
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      requestId,
    });
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Validation failed', {
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    });

    return reply.code(validationError.statusCode).send({
      error: validationError.code,
      message: validationError.message,
      details: validationError.details,
      requestId,
    });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    let appError: AppError;

    switch (error.code) {
      case 'P2002': // Unique constraint violation
        const target = (error.meta?.target as string[])?.join(', ') || 'field';
        appError = new ConflictError(`${target} already exists`);
        break;
      case 'P2025': // Record not found
        appError = new NotFoundError('Resource', 'unknown');
        break;
      case 'P2003': // Foreign key constraint
        appError = new ValidationError('Referenced resource does not exist');
        break;
      default:
        appError = new AppError(ERROR_CODES.DATABASE_ERROR, 'Database operation failed', 500);
    }

    return reply.code(appError.statusCode).send({
      error: appError.code,
      message: appError.message,
      requestId,
    });
  }

  // Fastify validation errors
  if (error.validation) {
    const validationError = new ValidationError('Request validation failed', {
      issues: error.validation.map((v) => ({
        path: v.instancePath || v.schemaPath,
        message: v.message,
      })),
    });

    return reply.code(validationError.statusCode).send({
      error: validationError.code,
      message: validationError.message,
      details: validationError.details,
      requestId,
    });
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    const rateLimitError = new RateLimitError();
    return reply.code(rateLimitError.statusCode).send({
      error: rateLimitError.code,
      message: rateLimitError.message,
      requestId,
    });
  }

  // Unknown errors - don't leak details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  return reply.code(statusCode).send({
    error: ERROR_CODES.INTERNAL_ERROR,
    message: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
    requestId,
  });
}

// 404 handler
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  return reply.code(404).send({
    error: ERROR_CODES.NOT_FOUND,
    message: `Route ${request.method} ${request.url} not found`,
    requestId: request.id,
  });
}