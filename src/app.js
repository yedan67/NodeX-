import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Импорт маршрутов
import userRoutes from './routes/users.js';
import nodeRoutes from './routes/nodes.js';
import subscriptionRoutes from './routes/subscriptions.js';
import autoNodeRoutes from './routes/auto-node.js';
import settingsRoutes from './routes/settings.js';
import statsRoutes from './routes/stats.js';

export function createApp() {
  const app = fastify({
    logger,
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  // Middleware
  app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  app.register(helmet, {
    contentSecurityPolicy: false,
  });

  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // JWT
  app.register(jwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: config.jwtExpiresIn,
    },
  });

  // Глобальный обработчик ошибок
  app.setErrorHandler(errorHandler);

  // Регистрация маршрутов
  app.register(userRoutes, { prefix: '/api/users' });
  app.register(nodeRoutes, { prefix: '/api/nodes' });
  app.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
  app.register(autoNodeRoutes, { prefix: '/api/auto-node' });
  app.register(settingsRoutes, { prefix: '/api/settings' });
  app.register(statsRoutes, { prefix: '/api/stats' });

  // Базовый маршрут
  app.get('/', async () => ({
    name: 'NodeX API',
    version: '1.0.0',
    status: 'running',
  }));

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  return app;
}
