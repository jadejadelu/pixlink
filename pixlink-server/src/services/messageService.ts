import prisma from '../config/database';
import logger from '../utils/logger';
import { MessageType } from '@prisma/client';

export class MessageService {
  async createMessage(roomId: string, userId: string, content: string, type: MessageType = MessageType.TEXT): Promise<any> {
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

      const message = await prisma.message.create({
        data: {
          roomId,
          userId,
          content,
          type,
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      });

      logger.info(`Message created in room ${roomId} by user ${userId}`);
      return message;
    } catch (error) {
      logger.error('Failed to create message:', error);
      throw error;
    }
  }

  async getMessages(roomId: string, userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
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

      const messages = await prisma.message.findMany({
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
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return messages;
    } catch (error) {
      logger.error('Failed to get messages:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      // Get the message
      const message = await prisma.message.findUnique({
        where: {
          id: messageId,
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user is the author or room owner
      const room = await prisma.room.findUnique({
        where: {
          id: message.roomId,
        },
      });

      if (message.userId !== userId && room?.ownerId !== userId) {
        throw new Error('Only message author or room owner can delete messages');
      }

      await prisma.message.delete({
        where: {
          id: messageId,
        },
      });

      logger.info(`Message ${messageId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete message:', error);
      throw error;
    }
  }

  async getMessageCount(roomId: string): Promise<number> {
    try {
      const count = await prisma.message.count({
        where: {
          roomId,
        },
      });

      return count;
    } catch (error) {
      logger.error('Failed to get message count:', error);
      throw new Error('Failed to get message count');
    }
  }
}

export default new MessageService();