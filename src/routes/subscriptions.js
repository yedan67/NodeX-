import {
  createSubscription,
  getSubscription,
  getSubscriptionConfig,
  getSubscriptionLink,
  deactivateSubscription,
} from '../controllers/subscriptionController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

async function subscriptionRoutes(fastify, options) {
  // Создать подписку (только админ)
  fastify.post('/', {
    preHandler: [authenticate, requireAdmin],
    handler: createSubscription,
  });

  // Получить подписку по ID (только админ)
  fastify.get('/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: getSubscription,
  });

  // Деактивировать подписку (только админ)
  fastify.delete('/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: deactivateSubscription,
  });

  // Получить конфиг подписки (публичный)
  fastify.get('/config/:uuid', {
    handler: getSubscriptionConfig,
  });

  // Получить ссылку на подписку (публичный)
  fastify.get('/link/:uuid', {
    handler: getSubscriptionLink,
  });
}

export default subscriptionRoutes;
