// Redis Plugin for Fastify

import Redis from 'ioredis';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    cache: {
      get: <T>(key: string) => Promise<T | null>;
      set: <T>(key: string, value: T, ttlSeconds?: number) => Promise<void>;
      del: (key: string) => Promise<void>;
      delPattern: (pattern: string) => Promise<void>;
    };
  }
}

const redisPlugin: FastifyPluginAsync = async (app) => {
  const redis = new Redis(env.REDIS_URL, {
    password: env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    app.log.error({ err }, 'Redis connection error');
  });

  redis.on('connect', () => {
    app.log.info('Redis connected');
  });

  await redis.connect();

  // Cache helper methods
  const cache = {
    async get<T>(key: string): Promise<T | null> {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        app.log.warn({ err, key }, 'Cache get failed');
        return null;
      }
    },

    async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        app.log.warn({ err, key }, 'Cache set failed');
      }
    },

    async del(key: string): Promise<void> {
      try {
        await redis.del(key);
      } catch (err) {
        app.log.warn({ err, key }, 'Cache del failed');
      }
    },

    async delPattern(pattern: string): Promise<void> {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (err) {
        app.log.warn({ err, pattern }, 'Cache delPattern failed');
      }
    },
  };

  app.decorate('redis', redis);
  app.decorate('cache', cache);

  app.addHook('onClose', async () => {
    await redis.quit();
  });
};

export default fp(redisPlugin);