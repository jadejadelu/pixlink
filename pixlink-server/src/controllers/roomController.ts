import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import roomService from '../services/roomService';
import membershipService from '../services/membershipService';
import messageService from '../services/messageService';
import tunnelService from '../services/tunnelService';
import gameShareService from '../services/gameShareService';
import { RoomVisibility, TunnelType, TunnelMode } from '@prisma/client';

export class RoomController {
  // Room endpoints
  async createRoom(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, visibility, inviteCode } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!name || typeof name !== 'string') {
        res.status(400).json({ success: false, error: 'Room name is required' });
        return;
      }

      const roomVisibility = visibility as RoomVisibility || RoomVisibility.PRIVATE;
      const room = await roomService.createRoom(userId, name, roomVisibility, inviteCode);

      res.status(201).json({ success: true, data: room });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to create room' });
    }
  }

  async getRooms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const rooms = await roomService.getRooms(userId);
      res.status(200).json({ success: true, data: rooms });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get rooms' });
    }
  }

  async getRoom(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Check if user is a member of the room
      const isMember = await roomService.isUserInRoom(id, userId);
      if (!isMember) {
        res.status(403).json({ success: false, error: 'You are not a member of this room' });
        return;
      }

      const room = await roomService.getRoom(id);
      res.status(200).json({ success: true, data: room });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get room' });
    }
  }

  async updateRoom(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, visibility } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const data: any = {};
      if (name) data.name = name;
      if (visibility) data.visibility = visibility as RoomVisibility;

      const room = await roomService.updateRoom(id, userId, data);
      res.status(200).json({ success: true, data: room });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to update room' });
    }
  }

  async deleteRoom(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await roomService.deleteRoom(id, userId);
      res.status(200).json({ success: true, data: { message: 'Room deleted successfully' } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to delete room' });
    }
  }

  // Membership endpoints
  async joinRoom(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { inviteCode } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const membership = await membershipService.joinRoom(id, userId, inviteCode);
      res.status(201).json({ success: true, data: membership });
    } catch (error: any) {
      const statusCode = error.message === 'Room not found' ? 404 : 
                        error.message === 'User is already a member of this room' ? 400 :
                        error.message === 'Invalid invite code' ? 403 : 500;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to join room' });
    }
  }

  async leaveRoom(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await membershipService.leaveRoom(id, userId);
      res.status(200).json({ success: true, data: { message: 'Left room successfully' } });
    } catch (error: any) {
      const statusCode = error.message === 'User is not a member of this room' ? 404 : 
                        error.message === 'Room owner cannot leave: room. Please delete the room instead.' ? 400 : 500;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to leave room' });
    }
  }

  async getMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const memberships = await membershipService.getMemberships(id);
      res.status(200).json({ success: true, data: memberships });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get members' });
    }
  }

  async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, userId: targetUserId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await membershipService.removeMember(id, userId, targetUserId);
      res.status(200).json({ success: true, data: { message: 'Member removed successfully' } });
    } catch (error: any) {
      const statusCode = error.message === 'Room not found' ? 404 : 
                        error.message === 'Only room owner can remove members' ? 403 :
                        error.message === 'Target user is not a member of this room' ? 404 :
                        error.message === 'Cannot remove room owner' ? 400 : 500;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to remove member' });
    }
  }

  // Message endpoints
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const messages = await messageService.getMessages(
        id,
        userId,
        parseInt(limit as string) || 50,
        parseInt(offset as string) || 0
      );

      res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get messages' });
    }
  }

  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { content, type } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!content || typeof content !== 'string') {
        res.status(400).json({ success: false, error: 'Message content is required' });
        return;
      }

      const message = await messageService.createMessage(id, userId, content, type);
      res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to send message' });
    }
  }

  // Tunnel endpoints
  async createTunnel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, port, mode } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!type || !port) {
        res.status(400).json({ success: false, error: 'Tunnel type and port are required' });
        return;
      }

      const tunnel = await tunnelService.createTunnel(
        id,
        userId,
        type as TunnelType,
        port,
        mode as TunnelMode || TunnelMode.RELAY
      );

      res.status(201).json({ success: true, data: tunnel });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to create tunnel' });
    }
  }

  async getTunnels(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const tunnels = await tunnelService.getTunnels(id, userId);
      res.status(200).json({ success: true, data: tunnels });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get tunnels' });
    }
  }

  // Game share endpoints
  async createGameShare(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, proto, port, templateKey, tunnelName } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!title || !proto || !port) {
        res.status(400).json({ success: false, error: 'Game share title, protocol, and port are required' });
        return;
      }

      const gameShare = await gameShareService.createGameShare(
        id,
        userId,
        title,
        proto as TunnelType,
        port,
        templateKey || 'custom',
        tunnelName
      );

      res.status(201).json({ success: true, data: gameShare });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to create game share' });
    }
  }

  async getGameShares(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const gameShares = await gameShareService.getGameShares(id, userId);
      res.status(200).json({ success: true, data: gameShares });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get game shares' });
    }
  }

  async getGameTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await gameShareService.getGameTemplates();
      res.status(200).json({ success: true, data: templates });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get game templates' });
    }
  }

  async deleteGameShare(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { gameShareId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await gameShareService.deleteGameShare(gameShareId, userId);
      res.status(200).json({ success: true, data: { message: 'Game share deleted successfully' } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to delete game share' });
    }
  }

  async getGameShareById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { gameShareId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // 检查用户是否有权限访问该游戏分享
      const gameShare = await gameShareService.getGameShareById(gameShareId, userId);

      res.status(200).json({ success: true, data: gameShare });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get game share' });
    }
  }

  async updateGameShare(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { gameShareId } = req.params;
      const { tunnelName } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!tunnelName) {
        res.status(400).json({ success: false, error: 'Tunnel name is required' });
        return;
      }

      const updatedGameShare = await gameShareService.updateGameShare(gameShareId, userId, tunnelName);
      res.status(200).json({ success: true, data: updatedGameShare });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to update game share' });
    }
  }

  async pauseGameShare(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { gameShareId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await gameShareService.pauseGameShare(gameShareId, userId);
      res.status(200).json({ success: true, data: { message: 'Game share paused successfully' } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to pause game share' });
    }
  }

  async resumeGameShare(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { gameShareId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await gameShareService.resumeGameShare(gameShareId, userId);
      res.status(200).json({ success: true, data: { message: 'Game share resumed successfully' } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to resume game share' });
    }
  }
}

export default new RoomController();