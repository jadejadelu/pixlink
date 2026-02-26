import prisma from '../config/database';
import logger from '../utils/logger';
import { TunnelType } from '@prisma/client';
import ztmTunnelService from './ztmTunnelService';

export class GameShareService {
  async createGameShare(roomId: string, userId: string, title: string, proto: TunnelType, port: number, templateKey: string = 'custom', hostHint: string = '127.0.0.1', tunnelName?: string): Promise<any> {
    try {
      // Check if user is a member of the room
      const membership = await prisma.membership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new Error('User is not a member of this room');
      }

      // Use tunnel name provided by frontend, or generate one if not provided
      const finalTunnelName = tunnelName || `gameshare-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Create the game share record
      const gameShare = await prisma.gameShare.create({
        data: {
          roomId,
          userId,
          title,
          proto,
          port,
          templateKey,
          hostHint, // Add hostHint to indicate where the game service is located
          status: 'ACTIVE', // 默认为活跃状态
          tunnelName: finalTunnelName, // 使用前端提供的隧道名称，或生成的名称
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Game share created in room ${roomId} by user ${userId}: ${title} (${proto}:${port}), tunnelName: ${finalTunnelName}`);
      return gameShare;
    } catch (error) {
      logger.error('Failed to create game share:', error);
      throw error;
    }
  }

  async getGameShares(roomId: string, userId: string): Promise<any[]> {
    try {
      // Check if user is a member of the room
      const membership = await prisma.membership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new Error('User is not a member of this room');
      }

      const gameShares = await prisma.gameShare.findMany({
        where: {
          roomId,
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return gameShares;
    } catch (error) {
      logger.error('Failed to get game shares:', error);
      throw error;
    }
  }

  async deleteGameShare(gameShareId: string, userId: string): Promise<void> {
    try {
      // Get the game share
      const gameShare = await prisma.gameShare.findUnique({
        where: {
          id: gameShareId,
        },
      });

      if (!gameShare) {
        throw new Error('Game share not found');
      }

      // Check if user is the creator or room owner
      const room = await prisma.room.findUnique({
        where: {
          id: gameShare.roomId,
        },
      });

      if (gameShare.userId !== userId && room?.ownerId !== userId) {
        throw new Error('Only game share creator or room owner can delete game shares');
      }

      // Note: Don't delete ZTM tunnel here - frontend handles tunnel cleanup
      // The tunnel will be cleaned up by the frontend when the game share is deleted

      await prisma.gameShare.delete({
        where: {
          id: gameShareId,
        },
      });

      logger.info(`Game share ${gameShareId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete game share:', error);
      throw error;
    }
  }

  async getGameTemplates(): Promise<any[]> {
    try {
      // In a real implementation, this would fetch templates from a database or config file
      // For now, we'll return a static list of common game templates
      const templates = [
        {
          key: 'minecraft',
          name: 'Minecraft',
          port: 25565,
          proto: 'TCP' as TunnelType,
          description: 'Minecraft Java Edition',
        },
        {
          key: 'steam',
          name: 'Steam Remote Play',
          port: 27036,
          proto: 'UDP' as TunnelType,
          description: 'Steam Remote Play Together',
        },
        {
          key: 'discord',
          name: 'Discord',
          port: 50000,
          proto: 'UDP' as TunnelType,
          description: 'Discord Voice Chat',
        },
        {
          key: 'custom',
          name: 'Custom',
          port: 0,
          proto: 'TCP' as TunnelType,
          description: 'Custom game or service',
        },
      ];

      return templates;
    } catch (error) {
      logger.error('Failed to get game templates:', error);
      throw error;
    }
  }

  async updateGameShare(gameShareId: string, userId: string, tunnelName: string): Promise<any> {
    try {
      // Get the game share
      const gameShare = await prisma.gameShare.findUnique({
        where: {
          id: gameShareId,
        },
      });

      if (!gameShare) {
        throw new Error('Game share not found');
      }

      // Check if user is the creator
      if (gameShare.userId !== userId) {
        throw new Error('Only game share creator can update the game share');
      }

      // Update the game share tunnel name
      const updatedGameShare = await prisma.gameShare.update({
        where: {
          id: gameShareId,
        },
        data: {
          tunnelName: tunnelName,
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Game share updated: ${gameShareId}, tunnelName: ${tunnelName}`);
      return updatedGameShare;
    } catch (error) {
      logger.error('Failed to update game share:', error);
      throw error;
    }
  }

  async pauseGameShare(gameShareId: string, userId: string): Promise<void> {
    try {
      // Get the game share
      const gameShare = await prisma.gameShare.findUnique({
        where: {
          id: gameShareId,
        },
      });

      if (!gameShare) {
        throw new Error('Game share not found');
      }

      // Check if user is the creator
      if (gameShare.userId !== userId) {
        throw new Error('Only game share creator can pause the game share');
      }

      // Note: Don't delete ZTM tunnel here - frontend handles tunnel management
      // The tunnel will be handled by the frontend when the game share is paused

      // Update the game share status to paused
      await prisma.gameShare.update({
        where: {
          id: gameShareId,
        },
        data: {
          status: 'PAUSED',
        },
      });

      logger.info(`Game share ${gameShareId} paused by user ${userId}`);
    } catch (error) {
      logger.error('Failed to pause game share:', error);
      throw error;
    }
  }

  async resumeGameShare(gameShareId: string, userId: string): Promise<void> {
    try {
      // Get the game share
      const gameShare = await prisma.gameShare.findUnique({
        where: {
          id: gameShareId,
        },
      });

      if (!gameShare) {
        throw new Error('Game share not found');
      }

      // Check if user is the creator
      if (gameShare.userId !== userId) {
        throw new Error('Only game share creator can resume the game share');
      }

      // Note: Don't recreate ZTM tunnel here - frontend handles tunnel management
      // The tunnel will be handled by the frontend when the game share is resumed

      // Update the game share status to active
      await prisma.gameShare.update({
        where: {
          id: gameShareId,
        },
        data: {
          status: 'ACTIVE',
        },
      });

      logger.info(`Game share ${gameShareId} resumed by user ${userId}`);
    } catch (error) {
      logger.error('Failed to resume game share:', error);
      throw error;
    }
  }

  async getGameShareById(gameShareId: string, userId: string): Promise<any> {
    try {
      // Get the game share
      const gameShare = await prisma.gameShare.findUnique({
        where: {
          id: gameShareId,
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!gameShare) {
        throw new Error('Game share not found');
      }

      // Check if user has permission to access this game share
      // User must be either the creator of the game share or a member of the room
      if (gameShare.userId !== userId) {
        // Check if user is a member of the room
        const membership = await prisma.membership.findUnique({
          where: {
            roomId_userId: {
              roomId: gameShare.roomId,
              userId,
            },
          },
        });

        if (!membership) {
          throw new Error('User does not have permission to access this game share');
        }
      }

      return gameShare;
    } catch (error) {
      logger.error('Failed to get game share by ID:', error);
      throw error;
    }
  }
}

export default new GameShareService();