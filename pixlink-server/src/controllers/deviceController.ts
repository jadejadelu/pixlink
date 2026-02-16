import { Response } from 'express';
import deviceService from '../services/deviceService';
import { AuthRequest, DeviceInfo, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class DeviceController {
  async createDevice(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const deviceInfo: DeviceInfo = req.body;

      const device = await deviceService.createDevice(req.userId, deviceInfo);

      const response: ApiResponse = {
        success: true,
        data: device,
      };

      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Create device error:', error);
      const statusCode = error.message === 'Device already exists' ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to create device',
      });
    }
  }

  async getDevices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const devices = await deviceService.getDevicesByUserId(req.userId);

      const response: ApiResponse = {
        success: true,
        data: devices,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Get devices error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get devices',
      });
    }
  }

  async updateDevice(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { deviceNonce } = req.params;
      const deviceInfo: Partial<DeviceInfo> = req.body;

      const device = await deviceService.getDeviceByNonce(deviceNonce);
      if (!device || device.userId !== req.userId) {
        res.status(404).json({
          success: false,
          error: 'Device not found',
        });
        return;
      }

      const updatedDevice = await deviceService.updateDeviceByNonce(deviceNonce, deviceInfo);

      const response: ApiResponse = {
        success: true,
        data: updatedDevice,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Update device error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update device',
      });
    }
  }

  async revokeDevice(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { deviceId } = req.params;

      await deviceService.revokeDevice(deviceId, req.userId);

      const response: ApiResponse = {
        success: true,
        message: 'Device revoked successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Revoke device error:', error);
      const statusCode = error.message === 'Device not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to revoke device',
      });
    }
  }

  async getDevice(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { deviceNonce } = req.params;

      const device = await deviceService.getDeviceByNonce(deviceNonce);
      if (!device || device.userId !== req.userId) {
        res.status(404).json({
          success: false,
          error: 'Device not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: device,
      };

      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Get device error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get device',
      });
    }
  }
}

export default new DeviceController();