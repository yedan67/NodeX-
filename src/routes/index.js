import settingsRoutes from './settings.js';
import subscriptionRoutes from './subscriptions.js';
import autoNodeRoutes from './auto-node.js';
import userRoutes from './users.js';
import nodeRoutes from './nodes.js';
import statsRoutes from './stats.js';

export async function registerRoutes(fastify) {
  fastify.register(settingsRoutes, { prefix: '/api/settings' });
  fastify.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
  fastify.register(autoNodeRoutes, { prefix: '/api/auto-node' });
  fastify.register(userRoutes, { prefix: '/api/users' });
  fastify.register(nodeRoutes, { prefix: '/api/nodes' });
  fastify.register(statsRoutes, { prefix: '/api/stats' });
}

export default {
  registerRoutes,
};
