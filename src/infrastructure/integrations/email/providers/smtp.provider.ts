// src/infrastructure/integrations/email/providers/smtp.provider.ts
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { BaseEmailProvider } from './base.provider';
import { SendEmailOptions, EmailSendResult } from '../types';
import { logger } from '../../../../shared/utils/logger';
import { config } from '../../../../core/config';

export class SmtpProvider extends BaseEmailProvider {
  private transporter: Transporter;

  constructor() {
    super('smtp');

    this.transporter = nodemailer.createTransport({
      host: config.services.email.smtp.host,
      port: config.services.email.smtp.port,
      secure: config.services.email.smtp.secure,
      auth: config.services.email.smtp.auth.user
        ? {
            user: config.services.email.smtp.auth.user,
            pass: config.services.email.smtp.auth.pass,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    try {
      const fromAddress = options.from || {
        name: config.services.email.from.name,
        email: config.services.email.from.email,
      };

      // Build mail options with proper types
      const mailOptions: SendMailOptions = {
        from: `"${fromAddress.name || config.services.email.from.name}" <${fromAddress.email}>`,
        to: this.formatAddressesForNodemailer(options.to),
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc ? this.formatAddressesForNodemailer(options.cc) : undefined,
        bcc: options.bcc ? this.formatAddressesForNodemailer(options.bcc) : undefined,
        replyTo: options.replyTo
          ? `"${options.replyTo.name || ''}" <${options.replyTo.email}>`.trim()
          : undefined,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.type,
          cid: att.contentId,
          encoding: typeof att.content === 'string' ? 'base64' : undefined,
        })),
        headers: options.headers,
      };

      // Send the email
      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent via SMTP', {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: options.subject,
        provider: this.name,
      });

      return this.createSuccessResult(info.messageId);
    } catch (error) {
      logger.error('Failed to send email via SMTP', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });

      return this.createErrorResult(
        error instanceof Error ? error.message : 'Failed to send email',
      );
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully', {
        host: config.services.email.smtp.host,
        port: config.services.email.smtp.port,
      });
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: config.services.email.smtp.host,
        port: config.services.email.smtp.port,
      });
      return false;
    }
  }

  /**
   * Format addresses for nodemailer - it accepts strings in format "Name <email>"
   */
  private formatAddressesForNodemailer(addresses: SendEmailOptions['to']): string | string[] {
    const normalized = this.normalizeEmailAddresses(addresses);

    const formatted = normalized.map((addr) => {
      if (addr.name) {
        return `"${addr.name}" <${addr.email}>`;
      }
      return addr.email;
    });

    // Return single string if only one address, otherwise array
    return formatted.length === 1 ? formatted[0] : formatted;
  }
}
