// src/services/roomService.ts

import apiService from './apiService';
import type {
  Room,
  RoomVisibility,
  Membership,
  MembershipRole,
  MembershipState,
  Tunnel,
  TunnelType,
  TunnelMode,
  TunnelState,
  GameShare,
  Message,
  MessageType,
} from '../types';

class RoomService {
  // Create a new room
  async createRoom(name: string, visibility: RoomVisibility = RoomVisibility.PRIVATE): Promise<Room> {
    try {
      const response = await apiService.createRoom(name, visibility);
      return response;
    } catch (error) {
      console.error('Create room error:', error);
      throw error;
    }
  }

  // Get all rooms
  async getRooms(): Promise<Room[]> {
    try {
      const response = await apiService.getRooms();
      return response;
    } catch (error) {
      console.error('Get rooms error:', error);
      return [];
    }
  }

  // Get room by id
  async getRoom(id: string): Promise<Room | null> {
    try {
      const response = await apiService.getRoom(id);
      return response;
    } catch (error) {
      console.error(`Get room error (${id}):`, error);
      return null;
    }
  }

  // Join room
  async joinRoom(id: string, inviteCode?: string): Promise<Membership | null> {
    try {
      const response = await apiService.joinRoom(id, inviteCode);
      return response;
    } catch (error) {
      console.error(`Join room error (${id}):`, error);
      return null;
    }
  }

  // Leave room
  async leaveRoom(id: string): Promise<boolean> {
    try {
      await apiService.leaveRoom(id);
      return true;
    } catch (error) {
      console.error(`Leave room error (${id}):`, error);
      return false;
    }
  }

  // Delete room
  async deleteRoom(id: string): Promise<boolean> {
    try {
      await apiService.deleteRoom(id);
      return true;
    } catch (error) {
      console.error(`Delete room error (${id}):`, error);
      return false;
    }
  }

  // Create tunnel
  async createTunnel(roomId: string, type: TunnelType, port: number): Promise<Tunnel | null> {
    try {
      const response = await apiService.createTunnel(roomId, type, port);
      return response;
    } catch (error) {
      console.error(`Create tunnel error (room: ${roomId}):`, error);
      return null;
    }
  }

  // Get tunnels
  async getTunnels(roomId: string): Promise<Tunnel[]> {
    try {
      const response = await apiService.getTunnels(roomId);
      return response;
    } catch (error) {
      console.error(`Get tunnels error (room: ${roomId}):`, error);
      return [];
    }
  }

  // Send message
  async sendMessage(roomId: string, content: string): Promise<Message | null> {
    try {
      const response = await apiService.sendMessage(roomId, content);
      return response;
    } catch (error) {
      console.error(`Send message error (room: ${roomId}):`, error);
      return null;
    }
  }

  // Get messages
  async getMessages(roomId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const response = await apiService.getMessages(roomId, limit, offset);
      return response;
    } catch (error) {
      console.error(`Get messages error (room: ${roomId}):`, error);
      return [];
    }
  }

  // Create game share
  async createGameShare(
    roomId: string,
    title: string,
    proto: TunnelType,
    port: number,
    templateKey: string = 'custom'
  ): Promise<GameShare | null> {
    try {
      const response = await apiService.createGameShare(roomId, {
        title,
        proto,
        port,
        templateKey,
      });
      return response;
    } catch (error) {
      console.error(`Create game share error (room: ${roomId}):`, error);
      return null;
    }
  }

  // Get game shares
  async getGameShares(roomId: string): Promise<GameShare[]> {
    try {
      const response = await apiService.getGameShares(roomId);
      return response;
    } catch (error) {
      console.error(`Get game shares error (room: ${roomId}):`, error);
      return [];
    }
  }

  // Get game templates
  async getGameTemplates(): Promise<any[]> {
    try {
      const response = await apiService.getGameTemplates();
      return response;
    } catch (error) {
      console.error('Get game templates error:', error);
      return [];
    }
  }

  // Check if user is room owner
  async isRoomOwner(roomId: string, userId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      return room?.ownerId === userId;
    } catch (error) {
      console.error(`Check room owner error (room: ${roomId}, user: ${userId}):`, error);
      return false;
    }
  }

  // Get room members
  async getRoomMembers(roomId: string): Promise<Membership[]> {
    try {
      const room = await this.getRoom(roomId);
      return room?.members || [];
    } catch (error) {
      console.error(`Get room members error (room: ${roomId}):`, error);
      return [];
    }
  }

  // Get room member count
  async getRoomMemberCount(roomId: string): Promise<number> {
    try {
      const members = await this.getRoomMembers(roomId);
      return members.length;
    } catch (error) {
      console.error(`Get room member count error (room: ${roomId}):`, error);
      return 0;
    }
  }

  // Check if user is in room
  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.getRoomMembers(roomId);
      return members.some(member => member.userId === userId);
    } catch (error) {
      console.error(`Check user in room error (room: ${roomId}, user: ${userId}):`, error);
      return false;
    }
  }

  // Get user role in room
  async getUserRoleInRoom(roomId: string, userId: string): Promise<MembershipRole | null> {
    try {
      const members = await this.getRoomMembers(roomId);
      const member = members.find(m => m.userId === userId);
      return member?.role || null;
    } catch (error) {
      console.error(`Get user role error (room: ${roomId}, user: ${userId}):`, error);
      return null;
    }
  }

  // Update room name
  async updateRoomName(roomId: string, name: string): Promise<boolean> {
    try {
      // In a real implementation, this would call the API
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error(`Update room name error (room: ${roomId}):`, error);
      return false;
    }
  }

  // Update room visibility
  async updateRoomVisibility(roomId: string, visibility: RoomVisibility): Promise<boolean> {
    try {
      // In a real implementation, this would call the API
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error(`Update room visibility error (room: ${roomId}):`, error);
      return false;
    }
  }
}

export const roomService = new RoomService();
export default roomService;