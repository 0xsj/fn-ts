// src/infrastructure/queue/processors/email.processor.ts
import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { EmailJobData } from '../types';
import { EmailService } from '../../integrations/email/email.service';
import { TOKENS } from '../../../core/di/tokens';
import { SendEmailOptions } from '../../integrations/email/types';
import { Injectable, Inject } from '../../../core/di/decorators';

@Injectable()
export class EmailProcessor extends BaseProcessor<EmailJobData> {
  name = 'EmailProcessor';

  constructor(@Inject(TOKENS.EmailService) private emailService: EmailService) {
    super();
  }

  protected async execute(job: Job<EmailJobData>): Promise<any> {
    // Update progress
    await job.updateProgress(10);

    // Convert job data to email options
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

    // Send email
    const result = await this.emailService.send(emailOptions);

    if (!result.success) {
      throw new Error(result.body().error.message);
    }

    await job.updateProgress(100);

    return {
      success: true,
      messageId: result.body().data.messageId,
      provider: result.body().data.provider,
      timestamp: result.body().data.timestamp,
    };
  }

  private async renderTemplate(data: EmailJobData): Promise<string> {
    // Your template rendering logic
    const templates: Record<string, (data: any) => string> = {
      welcome: (data) => `<h1>Welcome ${data.firstName}!</h1>`,
      'password-reset': (data) => `<h1>Reset your password</h1>`,
      // ... more templates
    };

    const template = templates[data.template || ''];
    return template ? template(data.data || {}) : '';
  }
}
