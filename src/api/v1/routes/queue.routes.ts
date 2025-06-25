// src/api/v1/routes/queue.routes.ts
import { Router, Request, Response } from 'express';
import { DIContainer } from '../../../core/di/container';
import { QueueManager } from '../../../infrastructure/queue/queue.manager';
import { TOKENS } from '../../../core/di/tokens';

export function createQueueRoutes(): Router {
  const router = Router();
  const queueManager = DIContainer.resolve<QueueManager>(TOKENS.QueueManager);

  // Get queue metrics
  router.get('/queues/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await queueManager.getAllMetrics();
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metrics',
      });
    }
  });

  // Test email queue
  router.post('/queues/test/email', async (req: Request, res: Response) => {
    try {
      const { to, subject, message } = req.body;
      const emailQueue = queueManager.getEmailQueue();

      const jobId = await emailQueue.sendEmailJob({
        to: to || 'test@example.com',
        subject: subject || 'Test Email from Queue',
        template: 'test',
        data: {
          message: message || 'This is a test email from the queue system',
          timestamp: new Date(),
        },
        correlationId: req.context?.correlationId,
      });

      res.json({
        success: true,
        message: 'Email queued successfully',
        jobId,
        correlationId: req.context?.correlationId,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue email',
      });
    }
  });

  // Test notification queue
  router.post('/queues/test/notification', async (req: Request, res: Response) => {
    try {
      const { userId, type, title, message } = req.body;
      const notificationQueue = queueManager.getNotificationQueue();

      const jobId = await notificationQueue.sendNotification({
        userId: userId || 'test-user-123',
        type: type || 'email',
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        correlationId: req.context?.correlationId,
      });

      res.json({
        success: true,
        message: 'Notification queued successfully',
        jobId,
        correlationId: req.context?.correlationId,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue notification',
      });
    }
  });

  // Pause all queues
  router.post('/queues/pause', async (req: Request, res: Response) => {
    try {
      await queueManager.pauseAll();
      res.json({
        success: true,
        message: 'All queues paused',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause queues',
      });
    }
  });

  // Resume all queues
  router.post('/queues/resume', async (req: Request, res: Response) => {
    try {
      await queueManager.resumeAll();
      res.json({
        success: true,
        message: 'All queues resumed',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume queues',
      });
    }
  });

  // Clean old jobs
  router.post('/queues/clean', async (req: Request, res: Response) => {
    try {
      const gracePeriod = req.body.gracePeriod || 24 * 60 * 60 * 1000; // 24 hours default
      await queueManager.cleanAllQueues(gracePeriod);
      res.json({
        success: true,
        message: 'Queues cleaned',
        gracePeriod,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clean queues',
      });
    }
  });

  return router;
}
