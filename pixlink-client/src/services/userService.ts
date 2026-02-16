// src/services/userService.ts

import apiService from './apiService';
import ztmService from './ztmService';
import type {
  User,
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
} from '../types';

class UserService {
  // Register a new user
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiService.register(data);
      // Set auth token only if session exists (for activated users)
      if (response.session && response.session.token) {
        apiService.setToken(response.session.token);
      }
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiService.login(data);
      // Set the auth token
      apiService.setToken(response.token);
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Check if device should be remembered
      const isRemembered = this.isDeviceRemembered();
      
      // If device is not remembered, leave mesh before logout
      if (!isRemembered) {
        try {
          // Get the current certificate ID from local storage
          const certificateId = localStorage.getItem('pixlink_certificate_id');
          
          if (certificateId) {
            console.log('Device is not remembered. Leaving mesh before logout...');
            await this.leaveMesh({ certificateId });
            console.log('Device has left mesh successfully.');
          }
        } catch (leaveError) {
          console.warn('Failed to leave mesh during logout:', leaveError);
          // Continue with logout even if leave mesh fails
        }
      } else {
        console.log('Device is remembered. Keeping mesh connection active.');
      }
      
      await apiService.logout();
      // Clear the auth token
      apiService.setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear the token anyway
      apiService.setToken(null);
      throw error;
    }
  }

  // Store certificate ID for later use
  storeCertificateId(certificateId: string): void {
    localStorage.setItem('pixlink_certificate_id', certificateId);
  }

  // Get stored certificate ID
  getCertificateId(): string | null {
    return localStorage.getItem('pixlink_certificate_id');
  }

  // Clear certificate ID
  clearCertificateId(): void {
    localStorage.removeItem('pixlink_certificate_id');
  }

  // Upload identity file
  async uploadIdentity(data: UploadIdentityRequest): Promise<UploadIdentityResponse> {
    try {
      const response = await apiService.uploadIdentity(data);
      return response;
    } catch (error) {
      console.error('Upload identity error:', error);
      throw error;
    }
  }

  // Send permit to email
  async sendPermit(data: SendPermitRequest): Promise<SendPermitResponse> {
    try {
      const response = await apiService.sendPermit(data);
      return response;
    } catch (error) {
      console.error('Send permit error:', error);
      throw error;
    }
  }

  // Leave mesh
  async leaveMesh(data: LeaveMeshRequest): Promise<LeaveMeshResponse> {
    try {
      const response = await apiService.leaveMesh(data);
      return response;
    } catch (error) {
      console.error('Leave mesh error:', error);
      throw error;
    }
  }

  // Update device settings
  async updateDeviceSettings(data: UpdateDeviceSettingsRequest): Promise<UpdateDeviceSettingsResponse> {
    try {
      const response = await apiService.updateDeviceSettings(data);
      return response;
    } catch (error) {
      console.error('Update device settings error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      // In a real implementation, this would fetch the current user from the API
      // For now, we'll just return null
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!apiService.getToken();
  }

  // Get auth token
  getAuthToken(): string | null {
    return apiService.getToken();
  }

  // Generate ZTM identity and upload
  async generateAndUploadIdentity(userId: string, email: string): Promise<UploadIdentityResponse> {
    try {
      // Get device ID from local storage or generate a new one
      const deviceId = this.getOrCreateDeviceId();
      
      // Use device ID directly as ZTM username (device ID already has 'device_' prefix)
      const ztmUsername = deviceId;
      
      // Get identity from local ZTM agent
      const identity = await ztmService.getIdentityFromLocalAgent();
      
      // Validate identity file
      if (!ztmService.validateIdentityFile(identity)) {
        throw new Error('Invalid identity file');
      }
      
      // Encrypt identity file
      const { encryptedIdentity, encryptionNonce, identityChecksum } = ztmService.encryptIdentityFile(identity);
      
      // Upload identity file
      const response = await this.uploadIdentity({
        userId,
        encryptedIdentity,
        encryptionNonce,
        identityChecksum,
        timestamp: new Date().toISOString(),
      });
      
      return response;
    } catch (error) {
      console.error('Generate and upload identity error:', error);
      throw error;
    }
  }

  // Get or create device ID
  private getOrCreateDeviceId(): string {
    const storageKey = 'pixlink_device_id';
    let deviceId = localStorage.getItem(storageKey);
    
    if (!deviceId) {
      // Generate a new device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(storageKey, deviceId);
    }
    
    return deviceId;
  }

  // Get current device ID
  getDeviceId(): string {
    return this.getOrCreateDeviceId();
  }

  // Check if device is remembered
  isDeviceRemembered(): boolean {
    const storageKey = 'pixlink_remember_device';
    const remembered = localStorage.getItem(storageKey);
    return remembered === 'true';
  }

  // Set device remember preference
  setDeviceRemembered(remembered: boolean): void {
    const storageKey = 'pixlink_remember_device';
    localStorage.setItem(storageKey, String(remembered));
  }

  // Complete user registration flow
  async completeRegistrationFlow(data: RegisterRequest): Promise<SendPermitResponse | null> {
    try {
      // Register user
      const registerResponse = await this.register(data);
      
      // Login user
      const loginResponse = await this.login({
        email: data.email,
        password: data.password,
      });
      
      // Generate and upload identity
      const uploadResponse = await this.generateAndUploadIdentity(registerResponse.user.id, data.email);
      
      // Store certificate ID for later use
      this.storeCertificateId(uploadResponse.certificateId);
      
      // Send permit to email
      const permitResponse = await this.sendPermit({
        certificateId: uploadResponse.certificateId,
      });
      
      return permitResponse;
    } catch (error) {
      console.error('Complete registration flow error:', error);
      throw error;
    }
  }

  // Complete user login flow
  async completeLoginFlow(data: LoginRequest): Promise<SendPermitResponse | null> {
    try {
      // Login user
      const loginResponse = await this.login(data);
      
      // Check if device is already joined to mesh
      const deviceId = this.getDeviceId();
      
      try {
        // Try to upload identity to check device status
        const uploadResponse = await this.generateAndUploadIdentity(loginResponse.user.id, data.email);
        
        // If device is already joined, return early
        if (uploadResponse.isJoinedMesh) {
          console.log('Device is already joined to mesh. No need to request permit.');
          return null;
        }
        
        // Device is not joined, proceed with permit request
        const permitResponse = await this.sendPermit({
          certificateId: uploadResponse.certificateId,
        });
        
        return permitResponse;
      } catch (uploadError: any) {
        // If upload fails, it might be because device is already joined
        if (uploadError.message && uploadError.message.includes('already joined')) {
          console.log('Device is already joined to mesh. No need to request permit.');
          return null;
        }
        throw uploadError;
      }
    } catch (error) {
      console.error('Complete login flow error:', error);
      throw error;
    }
  }

  // Check device status
  async checkDeviceStatus(userId: string): Promise<{ isJoinedMesh: boolean; certificateId?: string }> {
    try {
      const deviceId = this.getDeviceId();
      
      // Try to upload identity to check device status
      const uploadResponse = await this.generateAndUploadIdentity(userId, '');
      
      return {
        isJoinedMesh: uploadResponse.isJoinedMesh || false,
        certificateId: uploadResponse.certificateId
      };
    } catch (error: any) {
      // If upload fails, assume device is not joined
      console.error('Check device status error:', error);
      return {
        isJoinedMesh: false
      };
    }
  }

  // Resend activation email
  async resendActivationEmail(email: string): Promise<{ message: string }> {
    try {
      const response = await apiService.resendActivationEmail(email);
      return response;
    } catch (error) {
      console.error('Resend activation email error:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;