import { EmailSendResult, IEmailProvider, SendEmailOptions } from '../types';
import { logger } from '../../../../shared/utils';

export abstract class BaseEmailProvider implements IEmailProvider {
  constructor(public readonly name: string) {}

  abstract send(options: SendEmailOptions): Promise<EmailSendResult>;

  async verifyConnection(): Promise<boolean> {
    try {
      // Default implementation - can be overridden
      logger.info(`Verifying connection for ${this.name} provider`);
      return true;
    } catch (error) {
      logger.error(`Failed to verify ${this.name} connection`, { error });
      return false;
    }
  }
  protected createSuccessResult(messageId: string): EmailSendResult {
    return {
      messageId,
      success: true,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  protected createErrorResult(error: string): EmailSendResult {
    return {
      messageId: '',
      success: false,
      provider: this.name,
      timestamp: new Date(),
      error,
    };
  }

  protected normalizeEmailAddresses(
    addresses: SendEmailOptions['to'],
  ): Array<{ email: string; name?: string }> {
    const normalized = Array.isArray(addresses) ? addresses : [addresses];
    return normalized.map((addr) => (typeof addr === 'string' ? { email: addr } : addr));
  }
}
