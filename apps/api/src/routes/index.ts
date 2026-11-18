// Route Registration

import { FastifyInstance } from 'fastify';
import { mealRoutes } from './meals';
import { foodRoutes } from './foods';
import { cgmRoutes } from './cgm';
import { predictionRoutes } from './predictions';
import { insulinRoutes } from './insulin';
import { profileRoutes } from './profile';
import { authRoutes } from './auth';

export async function registerRoutes(app: FastifyInstance) {
  // API version prefix
  await app.register(async (api) => {
    api.register(authRoutes, { prefix: '/auth' });
    api.register(mealRoutes, { prefix: '/meals' });
    api.register(foodRoutes, { prefix: '/foods' });
    api.register(cgmRoutes, { prefix: '/cgm' });
    api.register(predictionRoutes, { prefix: '/predictions' });
    api.register(insulinRoutes, { prefix: '/insulin' });
    api.register(profileRoutes, { prefix: '/profile' });
  }, { prefix: '/api/v1' });
}