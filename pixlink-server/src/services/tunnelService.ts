import prisma from '../config/database';
import logger from '../utils/logger';
import { TunnelType, TunnelMode, TunnelState } from '@prisma/client';

export class TunnelService {
  async createTunnel(roomId: string, userId: string, type: TunnelType, port: number, mode: TunnelMode = TunnelMode.RELAY): Promise<any> {
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

      const tunnel = await prisma.tunnel.create({
        data: {
          roomId,
          type,
          port,
          mode,
          state: TunnelState.CREATED,
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Tunnel created in room ${roomId} by user ${userId}: ${type}:${port}`);
      return tunnel;
    } catch (error) {
      logger.error('Failed to create tunnel:', error);
      throw error;
    }
  }

  async getTunnels(roomId: string, userId: string): Promise<any[]> {
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

      const tunnels = await prisma.tunnel.findMany({
        where: {
          roomId,
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return tunnels;
    } catch (error) {
      logger.error('Failed to get tunnels:', error);
      throw error;
    }
  }

  async updateTunnelState(tunnelId: string, userId: string, state: TunnelState): Promise<any> {
    try {
      // Get the tunnel
      const tunnel = await prisma.tunnel.findUnique({
        where: {
          id: tunnelId,
        },
      });

      if (!tunnel) {
        throw new Error('Tunnel not found');
      }

      // Check if user is a member of the room
      const membership = await prisma.membership.findUnique({
        where: {
          roomId_userId: {
            roomId: tunnel.roomId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new Error('User is not a member of this room');
      }

      const updatedTunnel = await prisma.tunnel.update({
        where: {
          id: tunnelId,
        },
        data: {
          state,
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Tunnel ${tunnelId} state updated to ${state} by user ${userId}`);
      return updatedTunnel;
    } catch (error) {
      logger.error('Failed to update tunnel state:', error);
      throw error;
    }
  }

  async deleteTunnel(tunnelId: string, userId: string): Promise<void> {
    try {
      // Get the tunnel
      const tunnel = await prisma.tunnel.findUnique({
        where: {
          id: tunnelId,
        },
      });

      if (!tunnel) {
        throw new Error('Tunnel not found');
      }

      // Check if user is a member of the room
      const membership = await prisma.membership.findUnique({
        where: {
          roomId_userId: {
            roomId: tunnel.roomId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new Error('User is not a member of this room');
      }

      await prisma.tunnel.delete({
        where: {
          id: tunnelId,
        },
      });

      logger.info(`Tunnel ${tunnelId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete tunnel:', error);
      throw error;
    }
  }
}

export default new TunnelService();