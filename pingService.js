import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const prisma = new PrismaClient();

// Проверка доступности узла (ping)
export async function pingNode(nodeId) {
  try {
    const node = await prisma.node.findUnique({
      where: { id: parseInt(nodeId) },
    });

    if (!node) {
      throw new Error('Node not found');
    }

    const startTime = Date.now();
    let pingMs = null;
    let status = 'error';

    try {
      // Используем fetch для проверки доступности
      const response = await fetch(`https://${node.host}/ping`, {
        method: 'HEAD',
        signal: AbortSignal.timeout((config.pingTimeout || 5) * 1000),
      });

      pingMs = Date.now() - startTime;
      status = response.ok ? 'success' : 'error';
    } catch (error) {
      pingMs = Date.now() - startTime;
      status = 'timeout';
      logger.debug(`Ping to ${node.host} failed: ${error.message}`);
    }

    // Сохраняем результат в БД
    const log = await prisma.pingLog.create({
      data: {
        nodeId: parseInt(nodeId),
        pingMs: pingMs || -1,
        status,
      },
    });

    return {
      nodeId: parseInt(nodeId),
      host: node.host,
      pingMs: pingMs || -1,
      status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to ping node ${nodeId}:`, error);
    throw error;
  }
}

// Проверка всех узлов
export async function pingAllNodes() {
  try {
    const nodes = await prisma.node.findMany({
      where: { isActive: true },
    });

    const results = [];
    for (const node of nodes) {
      const result = await pingNode(node.id);
      results.push(result);
    }

    logger.info(`Pinged ${results.length} nodes`);
    return results;
  } catch (error) {
    logger.error('Failed to ping all nodes:', error);
    throw error;
  }
}

// Получить статистику пингов для узла
export async function getNodePingStats(nodeId, limit = 10) {
  try {
    const logs = await prisma.pingLog.findMany({
      where: { nodeId: parseInt(nodeId) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const stats = {
      nodeId: parseInt(nodeId),
      total: logs.length,
      success: logs.filter(l => l.status === 'success').length,
      errors: logs.filter(l => l.status !== 'success').length,
      avgPing: null,
      minPing: null,
      maxPing: null,
      recent: logs,
    };

    const successfulPings = logs
      .filter(l => l.pingMs > 0)
      .map(l => l.pingMs);

    if (successfulPings.length > 0) {
      stats.avgPing = Math.round(successfulPings.reduce((a, b) => a + b, 0) / successfulPings.length);
      stats.minPing = Math.min(...successfulPings);
      stats.maxPing = Math.max(...successfulPings);
    }

    return stats;
  } catch (error) {
    logger.error(`Failed to get ping stats for node ${nodeId}:`, error);
    throw error;
  }
}

// Получить статистику пингов для группы Auto-Node
export async function getGroupPingStats(groupId) {
  try {
    const group = await prisma.autoNodeGroup.findUnique({
      where: { id: parseInt(groupId) },
      include: {
        nodes: {
          include: {
            node: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const results = [];
    for (const { node } of group.nodes) {
      const stats = await getNodePingStats(node.id, 5);
      results.push({
        nodeId: node.id,
        name: node.name,
        host: node.host,
        stats,
      });
    }

    return {
      groupId: parseInt(groupId),
      groupName: group.name,
      nodes: results,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to get ping stats for group ${groupId}:`, error);
    throw error;
  }
}

// Выбор лучшего узла по пингу
export async function selectBestNode(groupId) {
  try {
    const group = await prisma.autoNodeGroup.findUnique({
      where: { id: parseInt(groupId) },
      include: {
        nodes: {
          include: {
            node: true,
          },
          orderBy: {
            priority: 'asc',
          },
        },
      },
    });

    if (!group || group.nodes.length === 0) {
      throw new Error('No nodes in group');
    }

    const results = [];
    for (const { node, weight, priority } of group.nodes) {
      const stats = await getNodePingStats(node.id, 1);
      const lastPing = stats.recent[0];
      results.push({
        node,
        pingMs: lastPing?.pingMs || -1,
        status: lastPing?.status || 'unknown',
        weight,
        priority,
      });
    }

    // Сортируем по пингу
    const sorted = results
      .filter(r => r.status === 'success' && r.pingMs > 0)
      .sort((a, b) => a.pingMs - b.pingMs);

    if (sorted.length === 0) {
      // Если все узлы недоступны, возвращаем первый по приоритету
      return results.sort((a, b) => a.priority - b.priority)[0];
    }

    return sorted[0];
  } catch (error) {
    logger.error(`Failed to select best node for group ${groupId}:`, error);
    throw error;
  }
}

export default {
  pingNode,
  pingAllNodes,
  getNodePingStats,
  getGroupPingStats,
  selectBestNode,
};
