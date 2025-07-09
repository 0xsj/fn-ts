// src/api/v1/routes/operations.routes.ts
import { Router } from 'express';
import { container } from 'tsyringe';
import { CronSchedulerService } from '../../../infrastructure/scheduler';
import { TOKENS } from '../../../core/di/tokens';
import { authMiddleware } from '../../../shared/middleware';

export function createOperationsRoutes(): Router {
  const router = Router();

  // Get all cron jobs
  router.get('/cron-jobs', authMiddleware, (req, res) => {
    try {
      const scheduler = container.resolve<CronSchedulerService>(TOKENS.CronScheduler);
      const jobs = scheduler.getAllJobs();
      res.json({
        success: true,
        count: jobs.length,
        jobs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get jobs',
      });
    }
  });

  // Manually trigger a job
  router.post('/cron-jobs/:name/run', authMiddleware, async (req, res) => {
    try {
      const scheduler = container.resolve<CronSchedulerService>(TOKENS.CronScheduler);
      const result = await scheduler.runJob(req.params.name);
      res.json({
        success: true,
        result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run job',
      });
    }
  });

  // Stop a job
  router.post('/cron-jobs/:name/stop', authMiddleware, (req, res) => {
    try {
      const scheduler = container.resolve<CronSchedulerService>(TOKENS.CronScheduler);
      scheduler.stopJob(req.params.name);
      res.json({
        success: true,
        message: `Job ${req.params.name} stopped`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop job',
      });
    }
  });

  // Start a job
  router.post('/cron-jobs/:name/start', authMiddleware, (req, res) => {
    try {
      const scheduler = container.resolve<CronSchedulerService>(TOKENS.CronScheduler);
      scheduler.startJob(req.params.name);
      res.json({
        success: true,
        message: `Job ${req.params.name} started`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start job',
      });
    }
  });

  router.post('/cron-jobs/public/:name/run', async (req, res) => {
    try {
      const scheduler = container.resolve<CronSchedulerService>(TOKENS.CronScheduler);
      const result = await scheduler.runJob(req.params.name);
      res.json({
        success: true,
        result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run job',
      });
    }
  });

  return router;
}
