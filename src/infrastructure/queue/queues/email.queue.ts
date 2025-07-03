// src/infrastructure/queue/queues/email.queue.ts
import { Job } from 'bullmq';
import { BaseQueue } from './base.queue';
import { EmailJobData, QueueName } from '../types';
import { logger } from '../../../shared/utils/logger';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';
import { EmailService } from '../../integrations/email/email.service';
import { SendEmailOptions } from '../../integrations/email/types';

export class EmailQueue extends BaseQueue {
  private emailService: EmailService;

  constructor() {
    super(QueueName.EMAIL);
    // Get EmailService from DI container
    this.emailService = DIContainer.resolve<EmailService>(TOKENS.EmailService);
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

        // Convert job data to SendEmailOptions
        const emailOptions: SendEmailOptions = {
          to: job.data.to,
          cc: job.data.cc,
          bcc: job.data.bcc,
          subject: job.data.subject,
          text: job.data.text,
          html: job.data.html || (await this.renderTemplate(job.data)),
          attachments: job.data.attachments,
          headers: job.data.headers,
          tags: job.data.tags,
          metadata: {
            jobId: job.id,
            correlationId: job.data.correlationId,
            template: job.data.template,
          },
        };

        // Send email using EmailService
        const result = await this.emailService.send(emailOptions);

        if (!result.success) {
          throw new Error(result.body().error.message);
        }

        const emailResult = result.body().data;

        // Update progress
        await job.updateProgress(100);

        logger.info('Email sent successfully', {
          jobId: job.id,
          messageId: emailResult.messageId,
          provider: emailResult.provider,
        });

        return {
          success: true,
          sentAt: emailResult.timestamp,
          messageId: emailResult.messageId,
          provider: emailResult.provider,
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
   * Render email template (placeholder - implement your template engine)
   */
  private async renderTemplate(data: EmailJobData): Promise<string> {
    // Simple template rendering - replace with your template engine
    const templates: Record<string, (data: any) => string> = {
      welcome: (data) => `
        <h2>Welcome ${data.firstName}!</h2>
        <p>Thank you for joining FireNotifications.</p>
        <p>Your account has been created successfully.</p>
        ${data.activationLink ? `<p><a href="${data.activationLink}">Activate your account</a></p>` : ''}
      `,
      'password-reset': (data) => `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password.</p>
        <p><a href="${data.resetLink}">Reset your password</a></p>
        <p>This link will expire in ${data.expiresIn}.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      'login-notification': (data) => `
        <h2>New Login Detected</h2>
        <p>We detected a new login to your account.</p>
        <p><strong>Time:</strong> ${data.loginTime}</p>
        <p><strong>IP Address:</strong> ${data.ipAddress || 'Unknown'}</p>
        <p><strong>Device:</strong> ${data.deviceName || 'Unknown'}</p>
        <p>If this wasn't you, please secure your account immediately.</p>
      `,
      'logout-notification': (data) => `
        <h2>You've been logged out</h2>
        <p>You have been successfully logged out from FireNotifications.</p>
        <p><strong>Time:</strong> ${data.logoutTime}</p>
        <p>Thanks for using our service!</p>
      `,
    };

    const template = templates[data.template || ''];
    if (!template) {
      return data.html || data.text || 'No content';
    }

    return template(data.data || {});
  }

  // Keep existing methods but update sendEmail to use EmailService
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
}
