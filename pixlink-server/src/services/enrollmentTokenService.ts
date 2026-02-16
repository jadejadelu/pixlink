import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import config from '../config';
import logger from '../utils/logger';

export class EnrollmentTokenService {
  async generateEnrollmentToken(
    userId: string,
    deviceNonce: string,
    type: 'MAGIC_LINK' | 'OTP'
  ): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + config.enrollmentToken.ttl * 1000);

    try {
      await prisma.enrollmentToken.create({
        data: {
          userId,
          deviceNonce,
          token,
          type,
          expiresAt,
        },
      });

      logger.info(`Enrollment token generated for user ${userId}, device ${deviceNonce}`);
      return token;
    } catch (error) {
      logger.error('Failed to generate enrollment token:', error);
      throw new Error('Failed to generate enrollment token');
    }
  }

  async verifyEnrollmentToken(
    token: string,
    deviceNonce: string
  ): Promise<{ userId: string; valid: boolean }> {
    try {
      const enrollmentToken = await prisma.enrollmentToken.findUnique({
        where: { token },
      });

      if (!enrollmentToken) {
        logger.warn(`Enrollment token not found: ${token}`);
        return { userId: '', valid: false };
      }

      if (enrollmentToken.used) {
        logger.warn(`Enrollment token already used: ${token}`);
        return { userId: '', valid: false };
      }

      if (enrollmentToken.expiresAt < new Date()) {
        logger.warn(`Enrollment token expired: ${token}`);
        return { userId: '', valid: false };
      }

      if (enrollmentToken.deviceNonce !== deviceNonce) {
        logger.warn(`Device nonce mismatch for token: ${token}`);
        return { userId: '', valid: false };
      }

      return { userId: enrollmentToken.userId, valid: true };
    } catch (error) {
      logger.error('Failed to verify enrollment token:', error);
      throw new Error('Failed to verify enrollment token');
    }
  }

  async markTokenAsUsed(token: string): Promise<void> {
    try {
      await prisma.enrollmentToken.update({
        where: { token },
        data: {
          used: true,
          usedAt: new Date(),
        },
      });

      logger.info(`Enrollment token marked as used: ${token}`);
    } catch (error) {
      logger.error('Failed to mark enrollment token as used:', error);
      throw new Error('Failed to mark enrollment token as used');
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.enrollmentToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info(`Cleaned up ${result.count} expired enrollment tokens`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error);
      throw new Error('Failed to cleanup expired tokens');
    }
  }
}

export default new EnrollmentTokenService();