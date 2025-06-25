// src/infrastructure/queue/queues/email.queue.ts
import { Job } from 'bullmq';
import { BaseQueue } from './base.queue';
import { EmailJobData, QueueName } from '../types';
import { logger } from '../../../shared/utils/logger';

export class EmailQueue extends BaseQueue {
  constructor() {
    super(QueueName.EMAIL);
  }

  /**
   * Initialize the worker for processing email jobs
   */
  startWorker(): void {
    this.createWorker(async (job: Job<EmailJobData>) => {
      logger.info('Processing email job', {
        jobId: job.id,
        to: job.data.to,
        template: job.data.template,
        correlationId: job.data.correlationId,
      });

      try {
        // Update job progress
        await job.updateProgress(10);

        // TODO: Integrate with actual email service (SendGrid, SES, etc.)
        // For now, simulate email sending
        await this.sendEmail(job.data);

        // Update progress
        await job.updateProgress(100);

        logger.info('Email sent successfully', {
          jobId: job.id,
          to: job.data.to,
        });

        return {
          success: true,
          sentAt: new Date(),
          messageId: `mock-${job.id}`,
        };
      } catch (error) {
        logger.error('Failed to send email', {
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    });
  }

  /**
   * Add an email job to the queue
   */
  async sendEmailJob(
    data: EmailJobData,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    },
  ): Promise<string> {
    const job = await this.addJob({
      name: 'send-email',
      data,
      options: {
        delay: options?.delay,
        priority: options?.priority,
        attempts: options?.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    return job.id!;
  }

  /**
   * Send a welcome email
   */
  async sendWelcomeEmail(
    userId: string,
    email: string,
    firstName: string,
    correlationId?: string,
  ): Promise<string> {
    return this.sendEmailJob({
      to: email,
      subject: 'Welcome to FireNotifications!',
      template: 'welcome',
      data: {
        userId,
        firstName,
        activationLink: `https://app.firenotifications.com/activate/${userId}`,
      },
      correlationId,
    });
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    correlationId?: string,
  ): Promise<string> {
    return this.sendEmailJob(
      {
        to: email,
        subject: 'Reset Your Password',
        template: 'password-reset',
        data: {
          resetLink: `https://app.firenotifications.com/reset-password/${resetToken}`,
          expiresIn: '1 hour',
        },
        correlationId,
      },
      {
        priority: 1, // High priority
      },
    );
  }

  /**
   * Mock email sending - replace with actual email service
   */
  private async sendEmail(data: EmailJobData): Promise<void> {
    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.info('Email would be sent', {
      to: data.to,
      subject: data.subject,
      template: data.template,
    });

    // In production, this would call SendGrid, AWS SES, etc.
    // Example:
    // await sendgrid.send({
    //   to: data.to,
    //   subject: data.subject,
    //   html: await renderTemplate(data.template, data.data),
    // });
  }

  // Override concurrency for email sending
  protected getConcurrency(): number {
    return 10; // Process 10 emails concurrently
  }

  protected getRateLimitMax(): number {
    return 50; // Max 50 emails
  }

  protected getRateLimitDuration(): number {
    return 60000; // per minute
  }
}
