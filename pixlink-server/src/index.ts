import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from './config';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import certificateRoutes from './routes/certificateRoutes';
import deviceRoutes from './routes/deviceRoutes';
import schedulerService from './services/schedulerService';

// Global async error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const app: Application = express();

app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/certs', certificateRoutes);
app.use('/api/devices', deviceRoutes);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PixLink Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundHandler);

app.use(errorHandler);

schedulerService.start();

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`PixLink Server is running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

export default app;