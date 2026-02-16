import * as cron from 'node-cron';
import userService from '../services/userService';
import logger from '../utils/logger';

class SchedulerService {
  private cleanupJob: cron.ScheduledTask | null = null;

  start(): void {
    if (this.cleanupJob) {
      logger.warn('Cleanup job is already running');
      return;
    }

    this.cleanupJob = cron.schedule('0 */10 * * * *', async () => {
      try {
        logger.info('Running scheduled cleanup of expired activations...');
        const deletedCount = await userService.cleanupExpiredActivations();
        logger.info(`Cleanup completed: ${deletedCount} expired accounts deleted`);
      } catch (error: any) {
        logger.error('Scheduled cleanup failed:', error);
      }
    });

    logger.info('Scheduler started: Cleanup job runs every 10 minutes');
  }

  stop(): void {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob = null;
      logger.info('Scheduler stopped');
    }
  }
}

export default new SchedulerService();