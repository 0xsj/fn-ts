// src/infrastructure/integrations/email/providers/console.provider.ts
import { BaseEmailProvider } from './base.provider';
import { SendEmailOptions, EmailSendResult } from '../types';
import { logger } from '../../../../shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Console email provider for development and testing
 * Logs emails to console instead of sending them
 */
export class ConsoleProvider extends BaseEmailProvider {
  constructor() {
    super('console');
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    const messageId = `console-${uuidv4()}`;

    // Log the email details
    logger.info('📧 EMAIL (Console Provider)', {
      messageId,
      from: options.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      hasText: !!options.text,
      hasHtml: !!options.html,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        size: Buffer.isBuffer(a.content) ? a.content.length : a.content.length,
        type: a.type,
        disposition: a.disposition,
      })),
      tags: options.tags,
      metadata: options.metadata,
    });

    // Log the actual content in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL CONTENT');
      console.log('='.repeat(60));
      console.log(
        `From: ${options.from?.name || 'System'} <${options.from?.email || 'noreply@firenotifications.com'}>`,
      );
      console.log(`To: ${this.formatRecipients(options.to)}`);
      if (options.cc) console.log(`CC: ${this.formatRecipients(options.cc)}`);
      if (options.bcc) console.log(`BCC: ${this.formatRecipients(options.bcc)}`);
      console.log(`Subject: ${options.subject}`);
      console.log('-'.repeat(60));

      if (options.text) {
        console.log('\nTEXT VERSION:');
        console.log(options.text);
      }

      if (options.html) {
        console.log('\nHTML VERSION:');
        console.log(options.html.substring(0, 500) + (options.html.length > 500 ? '...' : ''));
      }

      console.log('='.repeat(60) + '\n');
    }

    return this.createSuccessResult(messageId);
  }

  async verifyConnection(): Promise<boolean> {
    logger.info('Console email provider is always connected');
    return true;
  }

  private formatRecipients(recipients: SendEmailOptions['to']): string {
    const addresses = this.normalizeEmailAddresses(recipients);
    return addresses
      .map((addr) => (addr.name ? `${addr.name} <${addr.email}>` : addr.email))
      .join(', ');
  }
}
