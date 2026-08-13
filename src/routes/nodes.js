import {
  createNode,
  getNodes,
  getNodeById,
  updateNode,
  deleteNode,
  pingNode,
  getNodePingStats,
} from '../controllers/nodeController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

async function nodeRoutes(fastify, options) {
  // Создать узел (только админ)
  fastify.post('/', {
    preHandler: [authenticate, requireAdmin],
    handler: createNode,
  });

  // Получить все узлы (только админ)
  fastify.get('/', {
    preHandler: [authenticate, requireAdmin],
    handler: getNodes,
  });

  // Получить узел по ID (только админ)
  fastify.get('/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: getNodeById,
  });

  // Обновить узел (только админ)
  fastify.put('/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: updateNode,
  });

  // Удалить узел (только админ)
  fastify.delete('/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: deleteNode,
  });

  // Проверить доступность узла (только админ)
  fastify.post('/:id/ping', {
    preHandler: [authenticate, requireAdmin],
    handler: pingNode,
  });

  // Получить статистику пингов узла (только админ)
  fastify.get('/:id/ping-stats', {
    preHandler: [authenticate, requireAdmin],
    handler: getNodePingStats,
  });
}

export default nodeRoutes;
