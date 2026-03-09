// src/services/apiService.ts

import type {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  AuthResponse,
  UploadIdentityRequest,
  UploadIdentityResponse,
  SendPermitRequest,
  SendPermitResponse,
  LeaveMeshRequest,
  LeaveMeshResponse,
  UpdateDeviceSettingsRequest,
  UpdateDeviceSettingsResponse,
  ApiResponse,
} from '../types';

const API_BASE_URL = 'http://121.41.190.226:8113/api';

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`API request to: ${url}`);
    console.log(`Request options:`, options);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log(`Auth token: ${this.token.substring(0, 20)}...`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`Response status: ${response.status}`);
      console.log(`Response ok: ${response.ok}`);

      const data = await response.json() as ApiResponse<T>;
      console.log(`Response data:`, data);

      if (!response.ok) {
        console.log(`Response not ok, throwing error`);
        const error: any = new Error(data.error || `Request failed with status ${response.status}`);
        error.requiresActivation = data.requiresActivation;
        error.email = data.email;
        throw error;
      }

      if (!data.success || !data.data) {
        console.log(`Response data not successful, throwing error`);
        throw new Error(data.error || 'Request failed');
      }

      console.log(`Response successful, returning data`);
      return data.data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  async activateAccount(token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/activate', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendActivationEmail(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/resend-activation', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Identity endpoints
  async uploadIdentity(data: UploadIdentityRequest): Promise<UploadIdentityResponse> {
    return this.request<UploadIdentityResponse>('/auth/upload-identity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Permit endpoints
  async sendPermit(data: SendPermitRequest): Promise<SendPermitResponse> {
    return this.request<SendPermitResponse>('/auth/send-permit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Device management endpoints
  async leaveMesh(data: LeaveMeshRequest): Promise<LeaveMeshResponse> {
    return this.request<LeaveMeshResponse>('/auth/leave-mesh', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDeviceSettings(data: UpdateDeviceSettingsRequest): Promise<UpdateDeviceSettingsResponse> {
    return this.request<UpdateDeviceSettingsResponse>('/auth/device-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Certificate endpoints
  async getCertificates(): Promise<any[]> {
    return this.request<any[]>('/certs');
  }

  async revokeCertificate(certificateId: string): Promise<void> {
    return this.request<void>(`/certs/${certificateId}/revoke`, {
      method: 'POST',
    });
  }

  // Room endpoints
  async createRoom(name: string, visibility: string, inviteCode?: string): Promise<any> {
    return this.request<any>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, visibility, inviteCode }),
    });
  }

  async getRooms(): Promise<any[]> {
    return this.request<any[]>('/rooms');
  }

  async getRoom(id: string): Promise<any> {
    return this.request<any>(`/rooms/${id}`);
  }

  async updateRoom(id: string, data: { name?: string; visibility?: string; inviteCode?: string }): Promise<any> {
    return this.request<any>(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async joinRoom(id: string, inviteCode?: string): Promise<any> {
    return this.request<any>(`/rooms/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  }

  async leaveRoom(id: string): Promise<void> {
    return this.request<void>(`/rooms/${id}/leave`, {
      method: 'POST',
    });
  }

  async deleteRoom(id: string): Promise<void> {
    return this.request<void>(`/rooms/${id}`, {
      method: 'DELETE',
    });
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    return this.request<void>(`/rooms/${roomId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Tunnel endpoints
  async createTunnel(roomId: string, type: string, port: number): Promise<any> {
    return this.request<any>(`/rooms/${roomId}/tunnels`, {
      method: 'POST',
      body: JSON.stringify({ type, port }),
    });
  }

  async getTunnels(roomId: string): Promise<any[]> {
    return this.request<any[]>(`/rooms/${roomId}/tunnels`);
  }

  // Message endpoints
  async getMessages(roomId: string, limit?: number, offset?: number): Promise<any[]> {
    return this.request<any[]>(`/rooms/${roomId}/messages`);
  }

  async sendMessage(roomId: string, content: string): Promise<any> {
    return this.request<any>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type: 'text' }),
    });
  }

  // Game share endpoints
  async getGameTemplates(): Promise<any[]> {
    return this.request<any[]>('/games/templates');
  }

  async createGameShare(roomId: string, gameData: any): Promise<any> {
    return this.request<any>(`/rooms/${roomId}/shares`, {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  }

  async updateGameShare(gameShareId: string, tunnelName: string): Promise<any> {
    return this.request<any>(`/rooms/shares/${gameShareId}`, {
      method: 'PUT',
      body: JSON.stringify({ tunnelName }),
    });
  }

  async getGameShares(roomId: string): Promise<any[]> {
    return this.request<any[]>(`/rooms/${roomId}/shares`);
  }

  async getGameShareById(gameShareId: string): Promise<any> {
    return this.request<any>(`/rooms/shares/${gameShareId}`);
  }

  async deleteGameShare(gameShareId: string): Promise<void> {
    return this.request<void>(`/rooms/shares/${gameShareId}`, {
      method: 'DELETE',
    });
  }

  async pauseGameShare(gameShareId: string): Promise<void> {
    return this.request<void>(`/rooms/shares/${gameShareId}/pause`, {
      method: 'PATCH',
    });
  }

  async resumeGameShare(gameShareId: string): Promise<void> {
    return this.request<void>(`/rooms/shares/${gameShareId}/resume`, {
      method: 'PATCH',
    });
  }

  // Device endpoints
  async getDevices(): Promise<any[]> {
    return this.request<any[]>('/devices');
  }

  async revokeDevice(deviceId: string): Promise<void> {
    return this.request<void>(`/devices/${deviceId}/revoke`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
export default apiService;