import { Request, Response } from 'express';
import roomService from '../services/roomService';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
}

class RoomController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const room = await roomService.createRoom(req.userId!, req.body);

      res.status(201).json({
        success: true,
        data: room,
        message: `房间创建成功！房间号：${room.roomNumber}`
      });
    } catch (error: any) {
      logger.error('Create room error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getByRoomNumber(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomNumber } = req.params;
      const room = await roomService.findByRoomNumber(roomNumber);

      if (!room) {
        res.status(404).json({
          success: false,
          error: '房间不存在'
        });
        return;
      }

      const { password, ...roomData } = room;

      res.json({
        success: true,
        data: roomData
      });
    } catch (error: any) {
      logger.error('Get room by number error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async joinByNumber(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomNumber, password } = req.body;

      if (!roomNumber) {
        res.status(400).json({
          success: false,
          error: '房间号不能为空'
        });
        return;
      }

      const membership = await roomService.joinByRoomNumber(
        req.userId!,
        roomNumber,
        password
      );

      res.json({
        success: true,
        data: membership,
        message: '成功加入房间'
      });
    } catch (error: any) {
      logger.error('Join room by number error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rooms = await roomService.listUserRooms(req.userId!);

      const roomsWithoutPassword = rooms.map(room => {
        const { password, ...roomData } = room;
        return roomData;
      });

      res.json({
        success: true,
        data: roomsWithoutPassword
      });
    } catch (error: any) {
      logger.error('List rooms error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await roomService.getRoomById(id, req.userId!);

      if (!room) {
        res.status(404).json({
          success: false,
          error: '房间不存在'
        });
        return;
      }

      const { password, ...roomData } = room;

      res.json({
        success: true,
        data: roomData
      });
    } catch (error: any) {
      logger.error('Get room error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  async join(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { password } = req.body;

      const room = await roomService.getRoomById(id, req.userId!);

      if (!room) {
        res.status(404).json({
          success: false,
          error: '房间不存在'
        });
        return;
      }

      const membership = await roomService.joinByRoomNumber(
        req.userId!,
        room.roomNumber,
        password
      );

      res.json({
        success: true,
        data: membership,
        message: '成功加入房间'
      });
    } catch (error: any) {
      logger.error('Join room error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  async leave(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await roomService.leaveRoom(id, req.userId!);

      res.json({
        success: true,
        message: '已离开房间'
      });
    } catch (error: any) {
      logger.error('Leave room error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new RoomController();
