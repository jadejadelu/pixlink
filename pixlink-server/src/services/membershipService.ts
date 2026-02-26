import prisma from '../config/database';
import logger from '../utils/logger';
import { MembershipRole, MembershipState, RoomStatus } from '@prisma/client';

export class MembershipService {
  async joinRoom(roomId: string, userId: string, inviteCode?: string): Promise<any> {
    try {
      // Check if room exists and is active
      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
          status: RoomStatus.ACTIVE,
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      // Check if user is already a member
      const existingMembership = await prisma.membership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });

      if (existingMembership) {
        throw new Error('User is already a member of this room');
      }

      // Check if invite code is required and correct
      if (room.inviteCode && room.inviteCode !== inviteCode) {
        throw new Error('Invalid invite code');
      }

      // Create membership
      const membership = await prisma.membership.create({
        data: {
          roomId,
          userId,
          role: MembershipRole.MEMBER,
          state: MembershipState.ONLINE,
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
              visibility: true,
            },
          },
        },
      });

      logger.info(`User ${userId} joined room ${roomId}`);
      return membership;
    } catch (error) {
      logger.error('Failed to join room:', error);
      throw error;
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    try {
      // Check if membership exists
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

      // Check if user is the owner
      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
        },
      });

      if (room?.ownerId === userId) {
        throw new Error('Room owner cannot leave the room. Please delete the room instead.');
      }

      // Delete membership
      await prisma.membership.delete({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });

      logger.info(`User ${userId} left room ${roomId}`);
    } catch (error) {
      logger.error('Failed to leave room:', error);
      throw error;
    }
  }

  async getMemberships(roomId: string): Promise<any[]> {
    try {
      const memberships = await prisma.membership.findMany({
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
      });

      return memberships;
    } catch (error) {
      logger.error('Failed to get memberships:', error);
      throw new Error('Failed to get memberships');
    }
  }

  async updateMemberRole(roomId: string, userId: string, targetUserId: string, role: MembershipRole): Promise<any> {
    try {
      // Check if current user is the room owner
      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.ownerId !== userId) {
        throw new Error('Only room owner can update member roles');
      }

      // Check if target user is a member
      const membership = await prisma.membership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: targetUserId,
          },
        },
      });

      if (!membership) {
        throw new Error('Target user is not a member of this room');
      }

      // Update role
      const updatedMembership = await prisma.membership.update({
        where: {
          roomId_userId: {
            roomId,
            userId: targetUserId,
          },
        },
        data: {
          role,
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

      logger.info(`Updated role for user ${targetUserId} in room ${roomId} to ${role}`);
      return updatedMembership;
    } catch (error) {
      logger.error('Failed to update member role:', error);
      throw error;
    }
  }

  async updateMemberState(roomId: string, userId: string, state: MembershipState): Promise<any> {
    try {
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

      const updatedMembership = await prisma.membership.update({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
        data: {
          state,
          lastSeen: new Date(),
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

      return updatedMembership;
    } catch (error) {
      logger.error('Failed to update member state:', error);
      throw error;
    }
  }

  async removeMember(roomId: string, userId: string, targetUserId: string): Promise<void> {
    try {
      // Check if current user is the room owner
      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.ownerId !== userId) {
        throw new Error('Only room owner can remove members');
      }

      // Check if target user is a member
      const membership = await prisma.membership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: targetUserId,
          },
        },
      });

      if (!membership) {
        throw new Error('Target user is not a member of this room');
      }

      // Cannot remove owner
      if (room.ownerId === targetUserId) {
        throw new Error('Cannot remove room owner');
      }

      // Delete membership
      await prisma.membership.delete({
        where: {
          roomId_userId: {
            roomId,
            userId: targetUserId,
          },
        },
      });

      logger.info(`User ${targetUserId} removed from room ${roomId} by owner ${userId}`);
    } catch (error) {
      logger.error('Failed to remove member:', error);
      throw error;
    }
  }
}

export default new MembershipService();