import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/crypto.js';
import { pingNode, getNodePingStats } from '../services/pingService.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// Создать узел
export async function createNode(request, reply) {
  try {
    const {
      name,
      host,
      port,
      protocol,
      location,
      privateKey,
      publicKey,
      shortId,
      isActive,
      weight,
    } = request.body;

    if (!name || !host || !port || !privateKey || !publicKey || !shortId) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required fields: name, host, port, privateKey, publicKey, shortId',
      });
    }

    const encryptedPrivateKey = encrypt(privateKey);
    if (!encryptedPrivateKey) {
      return reply.status(500).send({
        success: false,
        error: 'Failed to encrypt private key',
      });
    }

    const node = await prisma.node.create({
      data: {
        name,
        host,
        port: parseInt(port),
        protocol: protocol || 'vless',
        location: location || 'Unknown',
        privateKey: JSON.stringify(encryptedPrivateKey),
        publicKey,
        shortId,
        isActive: isActive !== undefined ? isActive : true,
        weight: weight || 100,
      },
    });

    logger.info(`Node created: ${name} (${host})`);

    return reply.status(201).send({
      success: true,
      data: {
        ...node,
        privateKey: '[ENCRYPTED]',
      },
    });
  } catch (error) {
    logger.error('Create node error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Получить все узлы
export async function getNodes(request, reply) {
  try {
    const nodes = await prisma.node.findMany({
      include: {
        groups: {
          include: {
            group: true,
          },
        },
        pingLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const decodedNodes = nodes.map((node) => ({
      ...node,
      privateKey: '[ENCRYPTED]',
      lastPing: node.pingLogs[0] || null,
    }));

    return reply.status(200).send({
      success: true,
      data: decodedNodes,
      count: nodes.length,
    });
  } catch (error) {
    logger.error('Get nodes error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Получить узел по ID
export async function getNodeById(request, reply) {
  try {
    const { id } = request.params;

    const node = await prisma.node.findUnique({
      where: { id: parseInt(id) },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
        pingLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!node) {
      return reply.status(404).send({
        success: false,
        error: 'Node not found',
      });
    }

    let decryptedPrivateKey = null;
    try {
      const encryptedData = JSON.parse(node.privateKey);
      decryptedPrivateKey = decrypt(encryptedData);
    } catch (e) {
      logger.warn(`Failed to decrypt private key for node ${node.id}`);
    }

    return reply.status(200).send({
      success: true,
      data: {
        ...node,
        privateKey: decryptedPrivateKey || '[ENCRYPTED]',
        privateKeyEncrypted: node.privateKey,
      },
    });
  } catch (error) {
    logger.error('Get node by ID error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Обновить узел
export async function updateNode(request, reply) {
  try {
    const { id } = request.params;
    const {
      name,
      host,
      port,
      protocol,
      location,
      privateKey,
      publicKey,
      shortId,
      isActive,
      weight,
    } = request.body;

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (host !== undefined) updateData.host = host;
    if (port !== undefined) updateData.port = parseInt(port);
    if (protocol !== undefined) updateData.protocol = protocol;
    if (location !== undefined) updateData.location = location;
    if (publicKey !== undefined) updateData.publicKey = publicKey;
    if (shortId !== undefined) updateData.shortId = shortId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (weight !== undefined) updateData.weight = weight;

    if (privateKey) {
      const encryptedPrivateKey = encrypt(privateKey);
      if (!encryptedPrivateKey) {
        return reply.status(500).send({
          success: false,
          error: 'Failed to encrypt private key',
        });
      }
      updateData.privateKey = JSON.stringify(encryptedPrivateKey);
    }

    const node = await prisma.node.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    logger.info(`Node updated: ID ${id}`);

    return reply.status(200).send({
      success: true,
      message: 'Node updated successfully',
      data: {
        ...node,
        privateKey: '[ENCRYPTED]',
      },
    });
  } catch (error) {
    logger.error('Update node error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Удалить узел
export async function deleteNode(request, reply) {
  try {
    const { id } = request.params;

    await prisma.autoNodeGroupNode.deleteMany({
      where: { nodeId: parseInt(id) },
    });

    await prisma.pingLog.deleteMany({
      where: { nodeId: parseInt(id) },
    });

    await prisma.node.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`Node deleted: ID ${id}`);

    return reply.status(200).send({
      success: true,
      message: 'Node deleted successfully',
    });
  } catch (error) {
    logger.error('Delete node error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Проверить доступность узла (ping)
export async function pingNodeHandler(request, reply) {
  try {
    const { id } = request.params;
    const result = await pingNode(id);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Ping node error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Получить статистику пингов узла
export async function getNodePingStatsHandler(request, reply) {
  try {
    const { id } = request.params;
    const { limit = 10 } = request.query;

    const stats = await getNodePingStats(id, parseInt(limit));

    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get node ping stats error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

export default {
  createNode,
  getNodes,
  getNodeById,
  updateNode,
  deleteNode,
  pingNode: pingNodeHandler,
  getNodePingStats: getNodePingStatsHandler,
};
