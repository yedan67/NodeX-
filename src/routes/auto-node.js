import {
  createGroup,
  getGroups,
  getGroup,
  addNode,
  removeNode,
  getAutoConfig,
  getPingStats,
  getBestNode,
  updateGroup,
  deleteGroup,
} from '../controllers/autoNodeController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

async function autoNodeRoutes(fastify, options) {
  // Создать группу (только админ)
  fastify.post('/groups', {
    preHandler: [authenticate, requireAdmin],
    handler: createGroup,
  });

  // Получить все группы (только админ)
  fastify.get('/groups', {
    preHandler: [authenticate, requireAdmin],
    handler: getGroups,
  });

  // Получить группу по ID (только админ)
  fastify.get('/groups/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: getGroup,
  });

  // Обновить группу (только админ)
  fastify.put('/groups/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: updateGroup,
  });

  // Удалить группу (только админ)
  fastify.delete('/groups/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: deleteGroup,
  });

  // Добавить узел в группу (только админ)
  fastify.post('/groups/:id/nodes', {
    preHandler: [authenticate, requireAdmin],
    handler: addNode,
  });

  // Удалить узел из группы (только админ)
  fastify.delete('/groups/:id/nodes/:nodeId', {
    preHandler: [authenticate, requireAdmin],
    handler: removeNode,
  });

  // Получить Auto-Node конфиг (публичный)
  fastify.get('/config/:uuid', {
    handler: getAutoConfig,
  });

  // Получить статистику пингов группы (только админ)
  fastify.get('/groups/:id/ping-stats', {
    preHandler: [authenticate, requireAdmin],
    handler: getPingStats,
  });

  // Получить лучший узел (только админ)
  fastify.get('/groups/:id/best-node', {
    preHandler: [authenticate, requireAdmin],
    handler: getBestNode,
  });
}

export default autoNodeRoutes;
