import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const prisma = new PrismaClient();

// Получить все настройки
export async function getAllSettings() {
  try {
    const settings = await prisma.setting.findMany();
    
    const result = {};
    for (const setting of settings) {
      let value = JSON.parse(setting.value);
      // Если настройка зашифрована - расшифровываем
      if (setting.isEncrypted) {
        value = decrypt(value);
        if (value) {
          value = JSON.parse(value);
        }
      }
      result[setting.key] = value;
    }
    
    return result;
  } catch (error) {
    logger.error('Failed to get settings:', error);
    throw error;
  }
}

// Получить настройки по категории
export async function getSettingsByCategory(category) {
  try {
    const settings = await prisma.setting.findMany({
      where: { category },
    });
    
    const result = {};
    for (const setting of settings) {
      let value = JSON.parse(setting.value);
      if (setting.isEncrypted) {
        value = decrypt(value);
        if (value) {
          value = JSON.parse(value);
        }
      }
      result[setting.key] = value;
    }
    
    return result;
  } catch (error) {
    logger.error(`Failed to get settings for category ${category}:`, error);
    throw error;
  }
}

// Обновить настройки категории
export async function updateSettingsByCategory(category, data) {
  try {
    const existing = await prisma.setting.findMany({
      where: { category },
    });

    const results = [];
    for (const setting of existing) {
      const key = setting.key;
      const value = data[key] || data; // Если передан объект целиком
      
      // Если ключ чувствительный - шифруем
      let valueToSave = value;
      if (setting.isEncrypted) {
        valueToSave = encrypt(JSON.stringify(value));
      }
      
      const updated = await prisma.setting.update({
        where: { key },
        data: {
          value: JSON.stringify(valueToSave),
          updatedAt: new Date(),
        },
      });
      
      results.push(updated);
    }
    
    logger.info(`Settings updated for category: ${category}`);
    return results;
  } catch (error) {
    logger.error(`Failed to update settings for category ${category}:`, error);
    throw error;
  }
}

// Обновить конкретную настройку
export async function updateSetting(key, value) {
  try {
    const existing = await prisma.setting.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new Error(`Setting with key ${key} not found`);
    }

    let valueToSave = value;
    if (existing.isEncrypted) {
      valueToSave = encrypt(JSON.stringify(value));
    }

    const updated = await prisma.setting.update({
      where: { key },
      data: {
        value: JSON.stringify(valueToSave),
        updatedAt: new Date(),
      },
    });

    logger.info(`Setting updated: ${key}`);
    return updated;
  } catch (error) {
    logger.error(`Failed to update setting ${key}:`, error);
    throw error;
  }
}

// Сбросить настройки к дефолту
export async function resetSettings(category = null) {
  try {
    const where = category ? { category } : {};
    await prisma.setting.deleteMany({ where });
    
    // Пересоздаем дефолтные настройки
    await seedDefaultSettings();
    
    logger.info(`Settings reset: ${category || 'all'}`);
    return { success: true, message: 'Settings reset to defaults' };
  } catch (error) {
    logger.error('Failed to reset settings:', error);
    throw error;
  }
}

// Инициализация дефолтных настроек
async function seedDefaultSettings() {
  const defaultSettings = [
    {
      key: 'general',
      category: 'general',
      value: JSON.stringify({
        domain: config.defaultDomain || 'localhost',
        panel_url: config.defaultPanelUrl || 'http://localhost:3000',
        timezone: 'UTC',
        maintenance: false,
      }),
      description: 'Основные настройки панели',
      isEncrypted: false,
    },
    {
      key: 'subscription',
      category: 'subscription',
      value: JSON.stringify({
        path: config.defaultSubPath || '/sub/',
        auto_path: config.defaultAutoPath || '/auto/',
        default_format: 'xray',
        enable_auto_node: true,
        allowed_formats: ['xray', 'clash', 'singbox'],
        enable_traffic_stats: true,
        cache_ttl: 300,
      }),
      description: 'Настройки подписок',
      isEncrypted: false,
    },
    {
      key: 'security',
      category: 'security',
      value: JSON.stringify({
        cors_origins: ['*'],
        rate_limit: 100,
        enable_2fa: false,
        session_timeout: 86400,
      }),
      description: 'Настройки безопасности',
      isEncrypted: false,
    },
    {
      key: 'integrations',
      category: 'integrations',
      value: JSON.stringify({
        telegram: {
          enabled: false,
          bot_token: '',
          admin_chat_id: '',
        },
        webhooks: {
          subscription_created: '',
          subscription_expired: '',
          user_connected: '',
        },
      }),
      description: 'Интеграции',
      isEncrypted: false,
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
}

export default {
  getAllSettings,
  getSettingsByCategory,
  updateSettingsByCategory,
  updateSetting,
  resetSettings,
};
