import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding NodeX database...');

  // 1. Создание админа
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nodex.local' },
    update: {},
    create: {
      email: 'admin@nodex.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
      balance: 0,
    },
  });
  console.log(`✅ Admin created: ${admin.email} (password: admin123)`);

  // 2. Дефолтные настройки
  const defaultSettings = [
    {
      key: 'general',
      category: 'general',
      value: JSON.stringify({
        domain: 'localhost',
        panel_url: 'http://localhost:3000',
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
        path: '/sub/',
        auto_path: '/auto/',
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
  console.log('✅ Default settings created');

  console.log('🎉 Seeding complete!');
  console.log('📝 Login: admin@nodex.local');
  console.log('🔑 Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
