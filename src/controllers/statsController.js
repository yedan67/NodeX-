import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// Общая статистика
export async function getOverviewStats(request, reply) {
  try {
    const [
      totalUsers,
      activeUsers,
      totalNodes,
      activeNodes,
      totalSubscriptions,
      activeSubscriptions,
      totalTraffic,
      todayTraffic,
      totalGroups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.node.count(),
      prisma.node.count({ where: { isActive: true } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { isActive: true } }),
      prisma.subscription.aggregate({
        _sum: { usedGb: true },
      }),
      prisma.subscription.aggregate({
        where: {
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { usedGb: true },
      }),
      prisma.autoNodeGroup.count(),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        nodes: {
          total: totalNodes,
          active: activeNodes,
          inactive: totalNodes - activeNodes,
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          inactive: totalSubscriptions - activeSubscriptions,
        },
        traffic: {
          totalGb: totalTraffic._sum.usedGb || 0,
          todayGb: todayTraffic._sum.usedGb || 0,
        },
        autoNodeGroups: totalGroups,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get overview stats error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Статистика по пользователям
export async function getUserStatsOverview(request, reply) {
  try {
    const [total, byRole, topUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          balance: true,
          subscriptions: {
            where: { isActive: true },
            select: {
              limitGb: true,
              usedGb: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        total,
        byRole: byRole.reduce((acc, curr) => {
          acc[curr.role] = curr._count;
          return acc;
        }, {}),
        topUsers: topUsers.map((user) => ({
          ...user,
          totalLimitGb: user.subscriptions.reduce((sum, sub) => sum + sub.limitGb, 0),
          totalUsedGb: user.subscriptions.reduce((sum, sub) => sum + sub.usedGb, 0),
        })),
      },
    });
  } catch (error) {
    logger.error('Get user stats overview error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Статистика по трафику
export async function getTrafficStats(request, reply) {
  try {
    const { days = 7 } = request.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const traffic = await prisma.subscription.findMany({
      where: {
        updatedAt: {
          gte: startDate,
        },
      },
      select: {
        usedGb: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // Группировка по дням
    const dailyStats = {};
    for (const record of traffic) {
      const date = record.updatedAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = 0;
      }
      dailyStats[date] += record.usedGb;
    }

    const sortedDates = Object.keys(dailyStats).sort();
    const chartData = sortedDates.map((date) => ({
      date,
      trafficGb: dailyStats[date],
    }));

    return reply.status(200).send({
      success: true,
      data: {
        days: parseInt(days),
        totalTrafficGb: traffic.reduce((sum, t) => sum + t.usedGb, 0),
        chartData,
      },
    });
  } catch (error) {
    logger.error('Get traffic stats error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Статистика по узлам
export async function getNodesStats(request, reply) {
  try {
    const nodes = await prisma.node.findMany({
      include: {
        pingLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    const stats = nodes.map((node) => ({
      id: node.id,
      name: node.name,
      host: node.host,
      isActive: node.isActive,
      groups: node.groups.map((g) => g.group.name),
      lastPing: node.pingLogs[0] || null,
      uptime: node.isActive ? 'online' : 'offline',
    }));

    return reply.status(200).send({
      success: true,
      data: stats,
      count: stats.length,
    });
  } catch (error) {
    logger.error('Get nodes stats error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

export default {
  getOverviewStats,
  getUserStatsOverview,
  getTrafficStats,
  getNodesStats,
};
