import {
  getOverviewStats,
  getUserStatsOverview,
  getTrafficStats,
  getNodesStats,
} from '../controllers/statsController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

async function statsRoutes(fastify, options) {
  // Общая статистика (только админ)
  fastify.get('/overview', {
    preHandler: [authenticate, requireAdmin],
    handler: getOverviewStats,
  });

  // Статистика по пользователям (только админ)
  fastify.get('/users', {
    preHandler: [authenticate, requireAdmin],
    handler: getUserStatsOverview,
  });

  // Статистика по трафику (только админ)
  fastify.get('/traffic', {
    preHandler: [authenticate, requireAdmin],
    handler: getTrafficStats,
  });

  // Статистика по узлам (только админ)
  fastify.get('/nodes', {
    preHandler: [authenticate, requireAdmin],
    handler: getNodesStats,
  });
}

export default statsRoutes;
