import prisma from '../config/database';
import logger from '../utils/logger';
import { RoomVisibility, RoomStatus } from '@prisma/client';

export class RoomService {
  async createRoom(userId: string, name: string, visibility: RoomVisibility = RoomVisibility.PRIVATE, inviteCode?: string): Promise<any> {
    try {
      const room = await prisma.room.create({
        data: {
          ownerId: userId,
          name,
          visibility,
          inviteCode,
          status: RoomStatus.ACTIVE,
        },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      // Create membership for the owner
      await prisma.membership.create({
        data: {
          roomId: room.id,
          userId,
          role: 'OWNER',
          state: 'ONLINE',
        },
      });

      logger.info(`Room created: ${room.id} by user ${userId}`);
      return room;
    } catch (error) {
      logger.error('Failed to create room:', error);
      throw new Error('Failed to create room');
    }
  }

  async getRooms(userId: string): Promise<any[]> {
    try {
      const rooms = await prisma.room.findMany({
        where: {
          OR: [
            { ownerId: userId },
            {
              memberships: {
                some: {
                  userId,
                },
              },
            },
          ],
          status: RoomStatus.ACTIVE,
        },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                },
              },
            },
          },
          tunnels: true,
          gameShares: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return rooms;
    } catch (error) {
      logger.error('Failed to get rooms:', error);
      throw new Error('Failed to get rooms');
    }
  }

  async getRoom(roomId: string): Promise<any> {
    try {
      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
          status: RoomStatus.ACTIVE,
        },
        select: {
          id: true,
          ownerId: true,
          name: true,
          visibility: true,
          inviteCode: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                  email: true,
                },
              },
            },
          },
          tunnels: true,
          gameShares: true,
          messages: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 50,
          },
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      logger.error('Failed to get room:', error);
      throw new Error('Failed to get room');
    }
  }

  async updateRoom(roomId: string, userId: string, data: { name?: string; visibility?: RoomVisibility }): Promise<any> {
    try {
      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.ownerId !== userId) {
        throw new Error('Only room owner can update room');
      }

      const updatedRoom = await prisma.room.update({
        where: {
          id: roomId,
        },
        data: {
          ...data,
        },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Room updated: ${roomId} by user ${userId}`);
      return updatedRoom;
    } catch (error) {
      logger.error('Failed to update room:', error);
      throw error;
    }
  }

  async deleteRoom(roomId: string, userId: string): Promise<void> {
    try {
      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.ownerId !== userId) {
        throw new Error('Only room owner can delete room');
      }

      await prisma.$transaction([
        prisma.membership.deleteMany({
          where: {
            roomId,
          },
        }),
        prisma.tunnel.deleteMany({
          where: {
            roomId,
          },
        }),
        prisma.message.deleteMany({
          where: {
            roomId,
          },
        }),
        prisma.gameShare.deleteMany({
          where: {
            roomId,
          },
        }),
        prisma.room.delete({
          where: {
            id: roomId,
          },
        }),
      ]);

      logger.info(`Room deleted: ${roomId} by user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete room:', error);
      throw error;
    }
  }

  async getUserRooms(userId: string): Promise<any[]> {
    try {
      const memberships = await prisma.membership.findMany({
        where: {
          userId,
        },
        include: {
          room: {
            include: {
              memberships: {
                include: {
                  user: {
                    select: {
                      id: true,
                      nickname: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return memberships.map(membership => membership.room);
    } catch (error) {
      logger.error('Failed to get user rooms:', error);
      throw new Error('Failed to get user rooms');
    }
  }

  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const membership = await prisma.membership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });

      return !!membership;
    } catch (error) {
      logger.error('Failed to check if user is in room:', error);
      return false;
    }
  }

  async isRoomOwner(roomId: string, userId: string): Promise<boolean> {
    try {
      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
        },
        select: {
          ownerId: true,
        },
      });

      return room?.ownerId === userId;
    } catch (error) {
      logger.error('Failed to check if user is room owner:', error);
      return false;
    }
  }
}

export default new RoomService();