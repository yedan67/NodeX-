import {
  register,
  login,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
} from '../controllers/userController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

async function userRoutes(fastify, options) {
  // Регистрация (публичный)
  fastify.post('/register', {
    handler: register,
  });

  // Логин (публичный)
  fastify.post('/login', {
    handler: login,
  });

  // Получить всех пользователей (только админ)
  fastify.get('/', {
    preHandler: [authenticate, requireAdmin],
    handler: getUsers,
  });

  // Получить пользователя по ID (только админ)
  fastify.get('/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: getUserById,
  });

  // Обновить пользователя (только админ)
  fastify.put('/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: updateUser,
  });

  // Удалить пользователя (только админ)
  fastify.delete('/:id', {
    preHandler: [authenticate, requireAdmin],
    handler: deleteUser,
  });

  // Получить статистику пользователя (только админ)
  fastify.get('/:id/stats', {
    preHandler: [authenticate, requireAdmin],
    handler: getUserStats,
  });
}

export default userRoutes;
