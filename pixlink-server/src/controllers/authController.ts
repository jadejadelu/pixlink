import { Response } from 'express';
import userService from '../services/userService';
import ztmService from '../services/ztmService';
import prisma from '../config/database';
import { RegisterRequest, LoginRequest, ApiResponse, AuthRequest, UploadIdentityRequest, UploadIdentityResponse, LoginResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import emailService from '../services/emailService';
import config from '../config';

export class AuthController {
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data: RegisterRequest = req.body;
      
      const result = await userService.register(data);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Register error:', error);
      const statusCode = error.message === 'User already exists' ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Registration failed',
      });
    }
  }

  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data: LoginRequest = req.body;
      
      const result = await userService.login(data);

      if (!result.session) {
        res.status(400).json({
          success: false,
          error: 'Failed to create session',
        });
        return;
      }

      const loginResponse: LoginResponse = {
        user: result.user,
        token: result.session.token,
        nextAction: "upload_identity",
        uploadUrl: "/api/auth/upload-identity"
      };

      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: loginResponse,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Login error:', error);
      
      if (error.message === 'Account is pending activation. Please check your email for activation link.') {
        res.status(403).json({
          success: false,
          error: error.message,
          requiresActivation: true,
          email: req.body.email,
        });
        return;
      }
      
      const statusCode = error.message === 'Invalid password' ? 401 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Login failed',
      });
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'No token provided',
        });
        return;
      }

      const token = authHeader.substring(7);
      await userService.logout(token);

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Logout error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Logout failed',
      });
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const user = await userService.getUserById(req.userId);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Get profile error:', error);
      const statusCode = error.message === 'User not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to get profile',
      });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { nickname, avatar } = req.body;
      const user = await userService.updateProfile(req.userId, { nickname, avatar });

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Update profile error:', error);
      const statusCode = error.message === 'User not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to update profile',
      });
    }
  }

  async requestMagicLink(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { emailOrPhone, deviceNonce } = req.body;

      if (!emailOrPhone || !deviceNonce) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
        return;
      }

      const result = await userService.requestMagicLink(emailOrPhone, deviceNonce);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Request magic link error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to request magic link',
      });
    }
  }

  async requestOTP(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { emailOrPhone, deviceNonce } = req.body;

      if (!emailOrPhone || !deviceNonce) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
        return;
      }

      const result = await userService.requestOTP(emailOrPhone, deviceNonce);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Request OTP error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to request OTP',
      });
    }
  }

  async exchangeEnrollmentToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { enrollmentToken, deviceNonce } = req.body;

      if (!enrollmentToken || !deviceNonce) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
        return;
      }

      const result = await userService.exchangeEnrollmentToken(enrollmentToken, deviceNonce);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Exchange enrollment token error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to exchange enrollment token',
      });
    }
  }

  async uploadIdentity(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const data: UploadIdentityRequest = req.body;

      if (!data.encryptedIdentity || !data.encryptionNonce || !data.identityChecksum || !data.timestamp) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
        return;
      }

      // Use userId from JWT token if not provided in request body
      const userId = data.userId || req.userId;

      if (data.userId && data.userId !== req.userId) {
        res.status(403).json({
          success: false,
          error: 'User ID mismatch',
        });
        return;
      }

      if (!req.deviceId) {
        res.status(400).json({
          success: false,
          error: 'Device ID is required. Please login with device information.',
        });
        return;
      }

      // Step 1: Get user and device information
      const user = await prisma.user.findUnique({
        where: { id: req.userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const device = await prisma.device.findUnique({
        where: { id: req.deviceId }
      });

      if (!device) {
        res.status(404).json({
          success: false,
          error: 'Device not found',
        });
        return;
      }

      // Step 2: Validate ZTM root agent connection
      const agentConnected = await ztmService.validateAgentConnection();
      if (!agentConnected) {
        res.status(503).json({
          success: false,
          error: 'ZTM root agent not available',
        });
        return;
      }

      // Step 3: Generate ZTM username (use userId to allow multiple devices)
      const ztmUsername = userId;

      // Step 4: Check if device already has a certificate and is joined to mesh
      const existingCertificate = await prisma.certificate.findFirst({
        where: { deviceId: req.deviceId }
      });

      if (existingCertificate && existingCertificate.isJoinedMesh) {
        res.status(200).json({
          success: true,
          data: {
            certificateId: existingCertificate.id,
            nextAction: 'device_already_joined',
            message: 'Device is already joined to mesh. No need to upload identity again.',
            isJoinedMesh: true
          },
        });
        return;
      }

      // Step 5: Extract public key from encrypted identity
      let publicKey: string;
      try {
        const decryptedIdentity = data.encryptedIdentity.replace('encrypted_', '');
        
        // Check if identity is a valid PEM format public key
        if (decryptedIdentity.includes('-----BEGIN PUBLIC KEY-----') && 
            decryptedIdentity.includes('-----END PUBLIC KEY-----')) {
          publicKey = decryptedIdentity;
        } else {
          throw new Error('Invalid identity format: not a valid PEM public key');
        }
        
        if (!publicKey) {
          throw new Error('Public key not found in identity file');
        }
        
        logger.info(`Extracted public key from identity for device: ${ztmUsername}`);
      } catch (error: any) {
        logger.error('Failed to extract public key from identity:', error);
        throw new Error('Invalid identity file: unable to extract public key');
      }

      // Step 6: Create ZTM permit via root agent
      const ztmResult = await ztmService.createUserPermit(ztmUsername, publicKey);

      // Step 7: Create or update certificate in our system (without storing permit)
      const certificate = await prisma.certificate.upsert({
        where: { ztmUsername },
        update: {
          userId: userId,
          deviceId: req.deviceId,
          status: 'ACTIVE',
          fingerprint: `fp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          notBefore: new Date(),
          notAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          certificateChain: ztmResult.certificate,
          permitSent: false,
          permitEmail: null,
          isJoinedMesh: false,
          rememberDevice: true
        },
        create: {
          userId: userId,
          deviceId: req.deviceId,
          ztmUsername,
          status: 'ACTIVE',
          fingerprint: `fp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          notBefore: new Date(),
          notAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          certificateChain: ztmResult.certificate,
          permitSent: false,
          permitEmail: null,
          isJoinedMesh: false,
          rememberDevice: true
        },
      });

      // Step 8: Return waiting for permit send status
      const responseData: {
        certificateId: string;
        nextAction: string;
        message: string;
        debugPermit?: string;
      } = {
        certificateId: certificate.id,
        nextAction: 'send_permit',
        message: 'Identity uploaded successfully. Permit will be sent to your email.'
      };

      if (config.debugMode) {
        logger.info('Debug mode: Skipping email, returning permit in response');
        const meshInfo = await ztmService.getMeshInfo();
        const caCertificate = meshInfo.ca;
        
        const completePermitJson = {
          ca: caCertificate,
          agent: {
            certificate: ztmResult.certificate,
            name: user.nickname
          },
          bootstraps: [config.ztm.hubAddress]
        };
        
        const completePermitContent = JSON.stringify(completePermitJson, null, 2);
        responseData.debugPermit = completePermitContent;
        responseData.nextAction = 'import_permit';
        responseData.message = 'Identity uploaded successfully. Permit is ready for import.';
      }

      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
      };

      logger.info(`Identity uploaded for user: ${userId}, ZTM username: ${ztmUsername}, certificate ID: ${certificate.id}`);

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Upload identity error:', error);
      const statusCode = error.message === 'User ID mismatch' ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to upload identity',
      });
    }
  }

  async sendPermit(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { certificateId } = req.body;

      if (!certificateId) {
        res.status(400).json({
          success: false,
          error: 'Certificate ID is required',
        });
        return;
      }

      // Step 1: Get certificate from database
      const certificate = await prisma.certificate.findFirst({
        where: {
          id: certificateId,
          userId: req.userId
        },
      });

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: 'Certificate not found',
        });
        return;
      }

      // Step 2: Get user email
      const user = await prisma.user.findUnique({
        where: { id: req.userId }
      });

      if (!user || !user.email) {
        res.status(404).json({
          success: false,
          error: 'User email not found',
        });
        return;
      }

      // Step 3: Get ZTM permit from certificate chain and reconstruct full permit JSON
      const agentCertificate = certificate.certificateChain;
      
      // Get mesh info to get CA certificate
      const meshInfo = await ztmService.getMeshInfo();
      const caCertificate = meshInfo.ca;
      
      // Construct complete permit JSON (CA + Agent + Bootstraps)
      const completePermitJson = {
        ca: caCertificate,
        agent: {
          certificate: agentCertificate,
          name: user.nickname
        },
        bootstraps: [config.ztm.hubAddress]
      };
      
      const completePermitContent = JSON.stringify(completePermitJson, null, 2);

      if (config.debugMode) {
        logger.info(`Debug mode: Returning permit in response for user: ${user.id}, certificate: ${certificate.id}`);
        
        await prisma.certificate.update({
          where: { id: certificateId },
          data: {
            permitSent: true,
            permitSentAt: new Date(),
            permitEmail: user.email,
            isJoinedMesh: true
          }
        });

        const response: ApiResponse<{
          message: string;
          email: string;
          nextAction: string;
          certificateId: string;
          deviceId: string;
          debugPermit: string;
        }> = {
          success: true,
          data: {
            message: 'Debug mode: ZTM permit is ready for import.',
            email: user.email,
            nextAction: 'import_permit',
            certificateId: certificate.id,
            deviceId: certificate.deviceId || '',
            debugPermit: completePermitContent
          },
        };

        logger.info(`Permit returned in debug mode for ${user.email}, certificate: ${certificateId}, device: ${certificate.deviceId}`);
        res.status(200).json(response);
        return;
      }

      // Step 4: Send permit to email
      logger.info(`Sending ZTM permit to email: ${user.email}, certificate ID: ${certificate.id}`);

      emailService.sendPermitEmail({
        email: user.email,
        nickname: user.nickname,
        permitContent: completePermitContent,
        certificateId: certificate.id,
        deviceName: certificate.deviceId || 'Unknown Device'
      }).catch((emailError: any) => {
        logger.warn('Failed to send permit email', {
          userId: user.id,
          email: user.email,
          certificateId: certificate.id,
          error: emailError.message,
        });
      });

      // Step 6: Update certificate with permit sent status and mark device as joined mesh
      await prisma.certificate.update({
        where: { id: certificateId },
        data: {
          permitSent: true,
          permitSentAt: new Date(),
          permitEmail: user.email,
          isJoinedMesh: true
        }
      });

      const response: ApiResponse<{
        message: string;
        email: string;
        nextAction: string;
        certificateId: string;
        deviceId: string;
      }> = {
        success: true,
        data: {
          message: 'ZTM permit has been sent to your email. Please check your inbox and import the permit to complete device enrollment.',
          email: user.email,
          nextAction: 'import_permit',
          certificateId: certificate.id,
          deviceId: certificate.deviceId || ''
        },
      };

      logger.info(`Permit sent successfully to ${user.email} for certificate: ${certificateId}, device: ${certificate.deviceId}`);

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Send permit error:', error);
      const statusCode = error.message === 'Certificate not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to send permit',
      });
    }
  }

  async requestPasswordReset(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
        });
        return;
      }

      const result = await userService.requestPasswordReset(email);

      const response: ApiResponse<{
        message: string;
        resetUrl: string;
      }> = {
        success: true,
        data: {
          message: 'Password reset email has been sent. Please check your inbox.',
          resetUrl: result.resetUrl,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Request password reset error:', error);
      const statusCode = error.message === 'User not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to request password reset',
      });
    }
  }

  async resetPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Token and new password are required',
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long',
        });
        return;
      }

      await userService.resetPassword(token, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Reset password error:', error);
      const statusCode = error.message === 'Invalid reset token' || error.message === 'Reset token expired' ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to reset password',
      });
    }
  }

  async activateAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Activation token is required',
        });
        return;
      }

      await userService.activateAccount(token);

      const response: ApiResponse = {
        success: true,
        message: 'Account has been activated successfully. You can now log in.',
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Activate account error:', error);
      const statusCode = error.message === 'Invalid activation token' || error.message === 'Activation token expired' ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to activate account',
      });
    }
  }

  async leaveMesh(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      if (!req.deviceId) {
        res.status(400).json({
          success: false,
          error: 'Device ID is required',
        });
        return;
      }

      const { certificateId } = req.body;

      if (!certificateId) {
        res.status(400).json({
          success: false,
          error: 'Certificate ID is required',
        });
        return;
      }

      const certificate = await prisma.certificate.findFirst({
        where: {
          id: certificateId,
          userId: req.userId,
          deviceId: req.deviceId
        },
      });

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: 'Certificate not found',
        });
        return;
      }

      await prisma.certificate.update({
        where: { id: certificateId },
        data: {
          isJoinedMesh: false,
          rememberDevice: false
        }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Device has left the mesh successfully. You will need to upload identity and request permit again to rejoin.',
      };

      logger.info(`Device ${req.deviceId} left mesh for certificate: ${certificateId}`);

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Leave mesh error:', error);
      const statusCode = error.message === 'Certificate not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to leave mesh',
      });
    }
  }

  async updateDeviceSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      if (!req.deviceId) {
        res.status(400).json({
          success: false,
          error: 'Device ID is required',
        });
        return;
      }

      const { certificateId, rememberDevice } = req.body;

      if (!certificateId) {
        res.status(400).json({
          success: false,
          error: 'Certificate ID is required',
        });
        return;
      }

      if (typeof rememberDevice !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'rememberDevice must be a boolean value',
        });
        return;
      }

      const certificate = await prisma.certificate.findFirst({
        where: {
          id: certificateId,
          userId: req.userId,
          deviceId: req.deviceId
        },
      });

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: 'Certificate not found',
        });
        return;
      }

      await prisma.certificate.update({
        where: { id: certificateId },
        data: {
          rememberDevice
        }
      });

      const response: ApiResponse = {
        success: true,
        message: rememberDevice 
          ? 'Device will be remembered. You will not need to rejoin mesh on next login.'
          : 'Device will not be remembered. You will need to rejoin mesh on next login.',
      };

      logger.info(`Device ${req.deviceId} rememberDevice setting updated to: ${rememberDevice} for certificate: ${certificateId}`);

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Update device settings error:', error);
      const statusCode = error.message === 'Certificate not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to update device settings',
      });
    }
  }

  async resendActivationEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (user.status === 'ACTIVE') {
        res.status(400).json({
          success: false,
          error: 'Account is already activated',
        });
        return;
      }

      if (user.status !== 'PENDING') {
        res.status(400).json({
          success: false,
          error: 'Account is not in pending activation state',
        });
        return;
      }

      const activationToken = await userService.generateActivationToken(user.id);
      logger.info(`Resend activation - Debug mode status: ${config.debugMode}`);

      if (config.debugMode) {
        logger.info(`Debug mode: Returning activation token for user: ${user.id}`);
        const response: ApiResponse<{
          debugActivationToken: string;
        }> = {
          success: true,
          message: 'Debug mode: Activation token is ready for use.',
          data: {
            debugActivationToken: activationToken,
          },
        };
        res.status(200).json(response);
        return;
      }

      await emailService.sendActivationEmail(user.email, user.nickname, activationToken);

      logger.info(`Activation email resent for user: ${user.id}`);

      const response: ApiResponse = {
        success: true,
        message: 'Activation email has been resent. Please check your email.',
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Resend activation email error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to resend activation email',
      });
    }
  }
}

export default new AuthController();