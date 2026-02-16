import { Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  deviceId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const token = authHeader.substring(7);
    const session = await userService.verifySession(token);

    if (!session) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    req.userId = session.userId;
    req.deviceId = session.deviceId;

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }
};