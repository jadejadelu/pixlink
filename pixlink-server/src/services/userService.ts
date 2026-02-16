import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import config from '../config';
import logger from '../utils/logger';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types';
import deviceService from './deviceService';
import enrollmentTokenService from './enrollmentTokenService';
import emailService from './emailService';

export class UserService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            { phone: data.phone },
          ],
        },
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      let hashedPassword = null;
      if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 10);
      }

      const user = await prisma.user.create({
        data: {
          email: data.email || '',
          phone: data.phone || '',
          nickname: data.nickname,
          password: hashedPassword,
          status: 'PENDING',
        },
      });

      const activationToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + config.activationToken.ttl);

      await prisma.accountActivation.create({
        data: {
          userId: user.id,
          token: activationToken,
          expiresAt,
        },
      });

      logger.info(`User registered: ${user.id}, activation token created`);
      logger.info(`Debug mode status: ${config.debugMode}`);

      if (config.debugMode) {
        logger.info('Debug mode: Skipping email, returning activation token in response');
        return {
          user,
          session: null,
          requiresActivation: true,
          debugActivationToken: activationToken,
        };
      }

      if (user.email) {
        emailService.sendRegistrationEmail({
          email: user.email,
          nickname: user.nickname,
          activationToken,
          activationUrl: `${config.frontend.url}/activate?token=${activationToken}`,
        }).catch((emailError: any) => {
          logger.warn('Failed to send registration email', {
            userId: user.id,
            email: user.email,
            error: emailError.message,
          });
        });
      }

      return {
        user,
        session: null,
        requiresActivation: true,
      };
    } catch (error) {
      logger.error('Failed to register user:', error);
      throw error;
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            { phone: data.phone },
          ],
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'ACTIVE') {
        if (user.status === 'PENDING') {
          throw new Error('Account is pending activation. Please check your email for activation link.');
        }
        throw new Error('User account is not active');
      }

      if (user.password) {
        if (!data.password) {
          throw new Error('Password is required');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }
      }

      // Auto-create device if it doesn't exist
      let deviceId = data.deviceId;
      if (deviceId) {
        let device = await prisma.device.findUnique({
          where: { id: deviceId }
        });

        if (!device) {
          // Create a new device record
          device = await prisma.device.create({
            data: {
              id: deviceId,
              userId: user.id,
              os: 'Unknown',
              arch: 'Unknown',
              agentVersion: '1.0.0',
              deviceNonce: Math.random().toString(36).substring(2, 15),
            },
          });
          logger.info(`Auto-created device: ${deviceId} for user: ${user.id}`);
        }
      }

      const session = await this.createSession(user.id, deviceId);

      logger.info(`User logged in: ${user.id}, device: ${deviceId || 'unknown'}`);
      return {
        user,
        session,
      };
    } catch (error) {
      logger.error('Failed to login user:', error);
      throw error;
    }
  }

  async logout(sessionToken: string): Promise<void> {
    try {
      await prisma.session.delete({
        where: { token: sessionToken },
      });

      logger.info(`User logged out: ${sessionToken}`);
    } catch (error) {
      logger.error('Failed to logout user:', error);
      throw new Error('Failed to logout user');
    }
  }

  async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          nickname: true,
          avatar: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      logger.error('Failed to get user:', error);
      throw new Error('Failed to get user');
    }
  }

  async updateProfile(userId: string, data: { nickname?: string; avatar?: string }) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data,
      });

      logger.info(`User profile updated: ${userId}`);
      return user;
    } catch (error) {
      logger.error('Failed to update user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  async deactivateAccount(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'INACTIVE' },
      });

      await prisma.session.deleteMany({
        where: { userId },
      });

      logger.info(`User account deactivated: ${userId}`);
    } catch (error) {
      logger.error('Failed to deactivate account:', error);
      throw new Error('Failed to deactivate account');
    }
  }

  async requestMagicLink(
    emailOrPhone: string,
    deviceNonce: string
  ): Promise<{ enrollmentToken: string }> {
    try {
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emailOrPhone },
            { phone: emailOrPhone },
          ],
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const enrollmentToken = await enrollmentTokenService.generateEnrollmentToken(
        user.id,
        deviceNonce,
        'MAGIC_LINK'
      );

      logger.info(`Magic link requested for user ${user.id}`);
      
      return { enrollmentToken };
    } catch (error) {
      logger.error('Failed to request magic link:', error);
      throw error;
    }
  }

  async requestOTP(
    emailOrPhone: string,
    deviceNonce: string
  ): Promise<{ enrollmentToken: string }> {
    try {
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emailOrPhone },
            { phone: emailOrPhone },
          ],
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const enrollmentToken = await enrollmentTokenService.generateEnrollmentToken(
        user.id,
        deviceNonce,
        'OTP'
      );

      logger.info(`OTP requested for user ${user.id}`);
      
      return { enrollmentToken };
    } catch (error) {
      logger.error('Failed to request OTP:', error);
      throw error;
    }
  }

  async exchangeEnrollmentToken(
    enrollmentToken: string,
    deviceNonce: string
  ): Promise<AuthResponse> {
    try {
      const verification = await enrollmentTokenService.verifyEnrollmentToken(
        enrollmentToken,
        deviceNonce
      );

      if (!verification.valid) {
        throw new Error('Invalid or expired enrollment token');
      }

      await enrollmentTokenService.markTokenAsUsed(enrollmentToken);

      const user = await this.getUserById(verification.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const session = await this.createSession(user.id, deviceNonce);

      logger.info(`Enrollment token exchanged for user ${user.id}`);
      return {
        user,
        session,
      };
    } catch (error) {
      logger.error('Failed to exchange enrollment token:', error);
      throw error;
    }
  }

  private async createSession(userId: string, deviceId?: string): Promise<any> {
    const token = jwt.sign(
      { userId, deviceId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = await prisma.session.create({
      data: {
        userId,
        token,
        deviceId,
        expiresAt,
      },
    });

    return session;
  }

  async verifySession(token: string): Promise<{ userId: string; deviceId?: string } | null> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      const session = await prisma.session.findUnique({
        where: { token },
      });

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      return {
        userId: decoded.userId,
        deviceId: decoded.deviceId,
      };
    } catch (error) {
      logger.error('Failed to verify session:', error);
      return null;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info(`Cleaned up ${result.count} expired sessions`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      throw new Error('Failed to cleanup expired sessions');
    }
  }

  async requestPasswordReset(email: string): Promise<{ resetToken: string; resetUrl: string }> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { phone: email },
          ],
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.email) {
        throw new Error('User email not found');
      }

      const resetToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
        },
      });

      const resetUrl = `${config.frontend.url}/reset-password?token=${resetToken}`;

      logger.info(`Password reset requested for user ${user.id}`);

      emailService.sendPasswordResetEmail({
        email: user.email,
        nickname: user.nickname,
        resetUrl,
        resetToken,
      }).catch((emailError: any) => {
        logger.warn('Failed to send password reset email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
        });
      });

      return {
        resetToken,
        resetUrl,
      };
    } catch (error) {
      logger.error('Failed to request password reset:', error);
      throw error;
    }
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      const passwordReset = await prisma.passwordReset.findUnique({
        where: { token: resetToken },
      });

      if (!passwordReset) {
        throw new Error('Invalid reset token');
      }

      if (passwordReset.expiresAt < new Date()) {
        await prisma.passwordReset.delete({
          where: { id: passwordReset.id },
        });
        throw new Error('Reset token expired');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: passwordReset.userId },
        data: { password: hashedPassword },
      });

      await prisma.passwordReset.delete({
        where: { id: passwordReset.id },
      });

      await prisma.session.deleteMany({
        where: { userId: passwordReset.userId },
      });

      logger.info(`Password reset for user ${passwordReset.userId}`);
    } catch (error) {
      logger.error('Failed to reset password:', error);
      throw error;
    }
  }

  async activateAccount(activationToken: string): Promise<void> {
    try {
      if (config.debugMode) {
        logger.info('Debug mode: Activating account with token:', activationToken);
        const activation = await prisma.accountActivation.findUnique({
          where: { token: activationToken },
        });

        if (!activation) {
          throw new Error('Invalid activation token');
        }

        await prisma.user.update({
          where: { id: activation.userId },
          data: { status: 'ACTIVE' },
        });

        await prisma.accountActivation.delete({
          where: { id: activation.id },
        });

        logger.info(`Account activated for user ${activation.userId} (debug mode)`);
        return;
      }

      const activation = await prisma.accountActivation.findUnique({
        where: { token: activationToken },
      });

      if (!activation) {
        throw new Error('Invalid activation token');
      }

      if (activation.expiresAt < new Date()) {
        await prisma.accountActivation.delete({
          where: { id: activation.id },
        });
        throw new Error('Activation token expired');
      }

      await prisma.user.update({
        where: { id: activation.userId },
        data: { status: 'ACTIVE' },
      });

      await prisma.accountActivation.delete({
        where: { id: activation.id },
      });

      logger.info(`Account activated for user ${activation.userId}`);
    } catch (error) {
      logger.error('Failed to activate account:', error);
      throw error;
    }
  }

  async cleanupExpiredActivations(): Promise<number> {
    try {
      const expiredActivations = await prisma.accountActivation.findMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      const userIds = expiredActivations.map((a: any) => a.userId);

      await prisma.accountActivation.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: {
            id: {
              in: userIds,
            },
            status: 'PENDING',
          },
        });
      }

      logger.info(`Cleaned up ${expiredActivations.length} expired activations and deleted ${userIds.length} pending accounts`);
      return userIds.length;
    } catch (error) {
      logger.error('Failed to cleanup expired activations:', error);
      throw new Error('Failed to cleanup expired activations');
    }
  }

  async generateActivationToken(userId: string): Promise<string> {
    try {
      const activationToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + config.activationToken.ttl);

      await prisma.accountActivation.create({
        data: {
          userId,
          token: activationToken,
          expiresAt,
        },
      });

      logger.info(`Activation token generated for user: ${userId}`);
      return activationToken;
    } catch (error) {
      logger.error('Failed to generate activation token:', error);
      throw new Error('Failed to generate activation token');
    }
  }
}

export default new UserService();