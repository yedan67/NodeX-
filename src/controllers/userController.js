import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, generateApiKey } from '../utils/crypto.js';
import { generateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// Регистрация пользователя
export async function register(request, reply) {
  try {
    const { email, password, role = 'USER' } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Проверяем, существует ли пользователь
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: 'User already exists',
      });
    }

    const hashedPassword = await hashPassword(password);
    const apiKey = generateApiKey();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role,
        apiKey,
        isActive: true,
        balance: 0,
      },
    });

    logger.info(`User registered: ${email}`);

    return reply.status(201).send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        apiKey: user.apiKey,
        isActive: user.isActive,
        balance: user.balance,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error('Register error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Логин пользователя
export async function login(request, reply) {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Email and password are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      return reply.status(403).send({
        success: false,
        error: 'Account is disabled',
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Генерируем JWT токен
    const token = generateToken(request.server, user);

    logger.info(`User logged in: ${email}`);

    return reply.status(200).send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          balance: user.balance,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Получить всех пользователей
export async function getUsers(request, reply) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.status(200).send({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error('Get users error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Получить пользователя по ID
export async function getUserById(request, reply) {
  try {
    const { id } = request.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        subscriptions: {
          where: { isActive: true },
          include: {
            nodeGroup: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Обновить пользователя
export async function updateUser(request, reply) {
  try {
    const { id } = request.params;
    const { email, role, isActive, balance } = request.body;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        email: email || undefined,
        role: role || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        balance: balance !== undefined ? balance : undefined,
      },
    });

    logger.info(`User updated: ${user.email}`);

    return reply.status(200).send({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Update user error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Удалить пользователя
export async function deleteUser(request, reply) {
  try {
    const { id } = request.params;

    // Проверяем, не пытаемся ли удалить сами себя
    if (request.user && request.user.id === parseInt(id)) {
      return reply.status(403).send({
        success: false,
        error: 'Cannot delete yourself',
      });
    }

    // Сначала удаляем подписки пользователя
    await prisma.subscription.deleteMany({
      where: { userId: parseInt(id) },
    });

    // Затем удаляем пользователя
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`User deleted: ID ${id}`);

    return reply.status(200).send({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Получить статистику пользователя
export async function getUserStats(request, reply) {
  try {
    const { id } = request.params;

    const stats = await prisma.$transaction([
      prisma.subscription.count({
        where: { userId: parseInt(id), isActive: true },
      }),
      prisma.subscription.aggregate({
        where: { userId: parseInt(id) },
        _sum: { usedGb: true },
        _max: { limitGb: true },
      }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        userId: parseInt(id),
        activeSubscriptions: stats[0],
        totalUsedGb: stats[1]._sum.usedGb || 0,
        maxLimitGb: stats[1]._max.limitGb || 0,
      },
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

export default {
  register,
  login,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
};
