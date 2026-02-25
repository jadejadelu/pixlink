import prisma from '../config/database';
import logger from '../utils/logger';

export interface CreateRoomInput {
  name: string;
  roomNumber?: string;
  password?: string;
  maxPlayers?: number;
  gameType?: string;
}

export interface RoomWithNumber {
  id: string;
  roomNumber: string;
  name: string;
  ownerId: string;
  password: string | null;
  maxPlayers: number;
  gameType: string | null;
  visibility: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: {
    id: string;
    nickname: string;
  };
  _count?: {
    memberships: number;
  };
}

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

class RoomService {
  private validateRoomNumber(roomNumber: string): boolean {
    return /^\d{4,6}$/.test(roomNumber);
  }

  private async generateRoomNumber(): Promise<string> {
    const min = 1000;
    const max = 999999;
    let roomNumber: string;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 100;

    while (exists && attempts < maxAttempts) {
      roomNumber = Math.floor(Math.random() * (max - min + 1) + min).toString();
      const existing = await prisma.room.findUnique({
        where: { roomNumber }
      });
      exists = !!existing;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new AppError('无法生成唯一房间号，请稍后重试', 500);
    }

    return roomNumber!;
  }

  async createRoom(userId: string, input: CreateRoomInput): Promise<RoomWithNumber> {
    let { roomNumber } = input;

    if (roomNumber) {
      if (!this.validateRoomNumber(roomNumber)) {
        throw new AppError('房间号必须是 4-6 位数字', 400);
      }

      const existing = await prisma.room.findUnique({
        where: { roomNumber }
      });

      if (existing) {
        throw new AppError('该房间号已被使用', 409);
      }
    } else {
      roomNumber = await this.generateRoomNumber();
    }

    const room = await prisma.room.create({
      data: {
        roomNumber,
        name: input.name,
        ownerId: userId,
        password: input.password || null,
        maxPlayers: input.maxPlayers || 8,
        gameType: input.gameType || null,
        visibility: input.password ? 'PRIVATE' : 'PUBLIC',
        status: 'ACTIVE'
      }
    });

    await prisma.membership.create({
      data: {
        roomId: room.id,
        userId,
        role: 'OWNER'
      }
    });

    logger.info(`Room created: ${room.id} with number ${roomNumber} by user ${userId}`);

    return room as RoomWithNumber;
  }

  async findByRoomNumber(roomNumber: string): Promise<RoomWithNumber | null> {
    const room = await prisma.room.findUnique({
      where: { roomNumber },
      include: {
        owner: {
          select: { id: true, nickname: true }
        },
        _count: {
          select: { memberships: true }
        }
      }
    });

    return room as RoomWithNumber | null;
  }

  async joinByRoomNumber(
    userId: string,
    roomNumber: string,
    password?: string
  ) {
    const room = await this.findByRoomNumber(roomNumber);

    if (!room) {
      throw new AppError('房间不存在', 404);
    }

    if (room.status !== 'ACTIVE') {
      throw new AppError('房间已关闭', 400);
    }

    if (room.password && room.password !== password) {
      throw new AppError('房间密码错误', 403);
    }

    if (room._count && room._count.memberships >= room.maxPlayers) {
      throw new AppError('房间已满', 400);
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId
        }
      }
    });

    if (existingMembership) {
      throw new AppError('您已经是该房间的成员', 409);
    }

    const membership = await prisma.membership.create({
      data: {
        roomId: room.id,
        userId,
        role: 'MEMBER'
      }
    });

    logger.info(`User ${userId} joined room ${room.id} via room number ${roomNumber}`);

    return membership;
  }

  async getRoomById(roomId: string, userId: string): Promise<RoomWithNumber | null> {
    const membership = await prisma.membership.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      }
    });

    if (!membership) {
      throw new AppError('您没有权限访问该房间', 403);
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: { id: true, nickname: true }
        },
        _count: {
          select: { memberships: true }
        }
      }
    });

    return room as RoomWithNumber | null;
  }

  async listUserRooms(userId: string): Promise<RoomWithNumber[]> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            owner: {
              select: { id: true, nickname: true }
            },
            _count: {
              select: { memberships: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    return memberships.map(m => m.room as RoomWithNumber);
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const membership = await prisma.membership.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      }
    });

    if (!membership) {
      throw new AppError('您不是该房间的成员', 404);
    }

    if (membership.role === 'OWNER') {
      const otherMembers = await prisma.membership.findMany({
        where: { roomId, userId: { not: userId } }
      });

      if (otherMembers.length > 0) {
        throw new AppError('房主不能离开房间，请先转让房主权限或解散房间', 400);
      }

      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'DISSOLVED' }
      });
    }

    await prisma.membership.delete({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      }
    });

    logger.info(`User ${userId} left room ${roomId}`);
  }
}

export default new RoomService();
