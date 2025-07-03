// src/infrastructure/integrations/email/email.service.ts
import { injectable } from 'tsyringe';
import { IEmailProvider, SendEmailOptions, EmailSendResult } from './types';
import { SmtpProvider } from './providers/smtp.provider';
// import { SendGridProvider } from './providers/sendgrid.provider';
import { ConsoleProvider } from './providers/console.provider';
import { config } from '../../../core/config';
import { logger } from '../../../shared/utils/logger';
import { ResponseBuilder, ValidationError, ExternalServiceError } from '../../../shared/response';
import type { AsyncResult } from '../../../shared/response/types';

@injectable()
export class EmailService {
  private provider: IEmailProvider;
  private readonly providers: Map<string, IEmailProvider> = new Map();

  constructor() {
    // Initialize available providers
    this.initializeProviders();

    // Set the active provider based on configuration
    const providerName = config.services.email.provider;
    this.provider = this.getProvider(providerName);

    logger.info(`Email service initialized with ${providerName} provider`);
  }

  /**
   * Send an email using the configured provider
   */
  async send(options: SendEmailOptions): AsyncResult<EmailSendResult> {
    try {
      // Validate email options
      const validation = this.validateEmailOptions(options);
      if (!validation.valid) {
        return new ValidationError(
          validation.errors!.reduce(
            (acc, error) => {
              acc['email'] = acc['email'] || [];
              acc['email'].push(error);
              return acc;
            },
            {} as Record<string, string[]>,
          ),
        );
      }

      // Add default from address if not provided
      const emailOptions: SendEmailOptions = {
        ...options,
        from: options.from || {
          email: config.services.email.from.email,
          name: config.services.email.from.name,
        },
      };

      // Log the attempt
      logger.info('Sending email', {
        provider: this.provider.name,
        to: Array.isArray(emailOptions.to)
          ? emailOptions.to.map((t) => (typeof t === 'string' ? t : t.email))
          : typeof emailOptions.to === 'string'
            ? emailOptions.to
            : emailOptions.to.email,
        subject: emailOptions.subject,
      });

      // Send the email
      const result = await this.provider.send(emailOptions);

      if (result.success) {
        logger.info('Email sent successfully', {
          messageId: result.messageId,
          provider: result.provider,
        });
        return ResponseBuilder.ok(result);
      } else {
        logger.error('Failed to send email', {
          error: result.error,
          provider: result.provider,
        });
        return new ExternalServiceError('email-service', result.error || 'Failed to send email');
      }
    } catch (error) {
      logger.error('Email service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.provider.name,
      });

      return new ExternalServiceError(
        'email-service',
        error instanceof Error ? error : new Error('Email service error'),
      );
    }
  }

  /**
   * Send multiple emails in batch
   */
  async sendBatch(
    emails: SendEmailOptions[],
  ): AsyncResult<{ sent: EmailSendResult[]; failed: EmailSendResult[] }> {
    const results = await Promise.allSettled(emails.map((email) => this.send(email)));

    const sent: EmailSendResult[] = [];
    const failed: EmailSendResult[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        const successResult = result.value.body().data;
        sent.push(successResult);
      } else {
        failed.push({
          messageId: '',
          success: false,
          provider: this.provider.name,
          timestamp: new Date(),
          error: result.status === 'rejected' ? result.reason.message : 'Failed to send',
        });
      }
    });

    logger.info('Batch email send completed', {
      total: emails.length,
      sent: sent.length,
      failed: failed.length,
    });

    return ResponseBuilder.ok({ sent, failed });
  }

  /**
   * Verify the email service connection
   */
  async verifyConnection(): AsyncResult<{
    connected: boolean;
    provider: string;
    error?: string;
  }> {
    try {
      const isConnected = await this.provider.verifyConnection();

      return ResponseBuilder.ok({
        connected: isConnected,
        provider: this.provider.name,
      });
    } catch (error) {
      return ResponseBuilder.ok({
        connected: false,
        provider: this.provider.name,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }

  /**
   * Switch to a different email provider at runtime
   */
  setProvider(providerName: string): void {
    const provider = this.getProvider(providerName);
    this.provider = provider;
    logger.info(`Switched email provider to: ${providerName}`);
  }

  /**
   * Get available provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get current provider name
   */
  getCurrentProvider(): string {
    return this.provider.name;
  }

  /**
   * Initialize all available providers
   */
  private initializeProviders(): void {
    // Always available providers
    this.providers.set('console', new ConsoleProvider());
    this.providers.set('smtp', new SmtpProvider());

    // Conditional providers based on configuration
    if (config.services.email.sendgrid?.apiKey) {
      // this.providers.set('sendgrid', new SendGridProvider());
    }

    // You can add more providers here
    // if (config.services.email.ses?.accessKeyId) {
    //   this.providers.set('ses', new SesProvider());
    // }
  }

  /**
   * Get a provider by name
   */
  private getProvider(name: string): IEmailProvider {
    const provider = this.providers.get(name);

    if (!provider) {
      logger.warn(`Email provider '${name}' not found, falling back to console provider`);
      return this.providers.get('console')!;
    }

    return provider;
  }

  /**
   * Validate email options
   */
  private validateEmailOptions(options: SendEmailOptions): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Must have at least text or html content
    if (!options.text && !options.html) {
      errors.push('Email must have either text or html content');
    }

    // Validate recipients
    if (!options.to || (Array.isArray(options.to) && options.to.length === 0)) {
      errors.push('Email must have at least one recipient');
    }

    // Validate subject
    if (!options.subject || options.subject.trim().length === 0) {
      errors.push('Email must have a subject');
    }

    // Validate attachments if present
    if (options.attachments) {
      options.attachments.forEach((attachment, index) => {
        if (!attachment.filename) {
          errors.push(`Attachment ${index + 1} must have a filename`);
        }
        if (!attachment.content) {
          errors.push(`Attachment ${index + 1} must have content`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
