import {
  getSettings,
  getSettingsByCategory,
  updateSettingsCategory,
  updateSetting,
  resetSettings,
} from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

async function settingsRoutes(fastify, options) {
  // Получить все настройки
  fastify.get('/', {
    preHandler: [authenticate, requireAdmin],
    handler: getSettings,
  });

  // Получить настройки по категории
  fastify.get('/:category', {
    preHandler: [authenticate, requireAdmin],
    handler: getSettingsByCategory,
  });

  // Обновить настройки категории
  fastify.put('/:category', {
    preHandler: [authenticate, requireAdmin],
    handler: updateSettingsCategory,
  });

  // Обновить конкретную настройку
  fastify.put('/setting/:key', {
    preHandler: [authenticate, requireAdmin],
    handler: updateSetting,
  });

  // Сбросить настройки
  fastify.post('/reset', {
    preHandler: [authenticate, requireAdmin],
    handler: resetSettings,
  });
}

export default settingsRoutes;
