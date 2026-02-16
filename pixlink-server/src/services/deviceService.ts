import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import logger from '../utils/logger';
import { DeviceInfo } from '../types';

export class DeviceService {
  async createDevice(
    userId: string,
    deviceInfo: DeviceInfo
  ): Promise<any> {
    const deviceNonce = uuidv4();

    try {
      const device = await prisma.device.create({
        data: {
          userId,
          os: deviceInfo.os,
          arch: deviceInfo.arch,
          agentVersion: deviceInfo.agentVersion,
          deviceNonce,
        },
      });

      logger.info(`Device created for user ${userId}: ${device.id}`);
      return device;
    } catch (error) {
      logger.error('Failed to create device:', error);
      throw new Error('Failed to create device');
    }
  }

  async getDeviceByNonce(deviceNonce: string): Promise<any> {
    try {
      const device = await prisma.device.findUnique({
        where: { deviceNonce },
        include: {
          user: true,
          certificates: true,
        },
      });

      return device;
    } catch (error) {
      logger.error('Failed to get device by nonce:', error);
      throw new Error('Failed to get device');
    }
  }

  async getDevicesByUserId(userId: string): Promise<any[]> {
    try {
      const devices = await prisma.device.findMany({
        where: { userId },
        include: {
          certificates: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
        orderBy: {
          lastSeen: 'desc',
        },
      });

      return devices;
    } catch (error) {
      logger.error('Failed to get devices by user:', error);
      throw new Error('Failed to get devices');
    }
  }

  async updateDeviceLastSeen(deviceId: string): Promise<void> {
    try {
      await prisma.device.update({
        where: { id: deviceId },
        data: {
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update device last seen:', error);
      throw new Error('Failed to update device');
    }
  }

  async updateDeviceByNonce(
    deviceNonce: string,
    deviceInfo: Partial<DeviceInfo>
  ): Promise<any> {
    try {
      const device = await prisma.device.update({
        where: { deviceNonce },
        data: {
          ...deviceInfo,
          lastSeen: new Date(),
        },
      });

      logger.info(`Device updated: ${device.id}`);
      return device;
    } catch (error) {
      logger.error('Failed to update device:', error);
      throw new Error('Failed to update device');
    }
  }

  async revokeDevice(deviceId: string, userId: string): Promise<void> {
    try {
      const device = await prisma.device.findFirst({
        where: {
          id: deviceId,
          userId,
        },
      });

      if (!device) {
        throw new Error('Device not found');
      }

      await prisma.$transaction([
        prisma.certificate.updateMany({
          where: {
            deviceId,
            status: 'ACTIVE',
          },
          data: {
            status: 'REVOKED',
          },
        }),
        prisma.device.delete({
          where: { id: deviceId },
        }),
      ]);

      logger.info(`Device revoked: ${deviceId}`);
    } catch (error) {
      logger.error('Failed to revoke device:', error);
      throw new Error('Failed to revoke device');
    }
  }

  async getDeviceWithActiveCertificate(deviceId: string): Promise<any> {
    try {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        include: {
          certificates: {
            where: {
              status: 'ACTIVE',
              notAfter: {
                gt: new Date(),
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

      return device;
    } catch (error) {
      logger.error('Failed to get device with certificate:', error);
      throw new Error('Failed to get device');
    }
  }

  async cleanupInactiveDevices(inactiveDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

      const result = await prisma.device.deleteMany({
        where: {
          lastSeen: {
            lt: cutoffDate,
          },
          certificates: {
            none: {
              status: 'ACTIVE',
            },
          },
        },
      });

      logger.info(`Cleaned up ${result.count} inactive devices`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup inactive devices:', error);
      throw new Error('Failed to cleanup inactive devices');
    }
  }
}

export default new DeviceService();