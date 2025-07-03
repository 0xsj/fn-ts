// src/infrastructure/integrations/email/types.ts
import { z } from 'zod';

export const EmailAddressSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export const EmailAttachmentSchema = z.object({
  filename: z.string(),
  content: z.string().or(z.instanceof(Buffer)),
  type: z.string().optional(),
  disposition: z.enum(['attachment', 'inline']).default('attachment'),
  contentId: z.string().optional(),
});

export const SendEmailOptionsSchema = z.object({
  to: z.array(EmailAddressSchema).or(EmailAddressSchema),
  from: EmailAddressSchema.optional(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  cc: z.array(EmailAddressSchema).or(EmailAddressSchema).optional(), // Fixed: allow single or array
  bcc: z.array(EmailAddressSchema).or(EmailAddressSchema).optional(), // Fixed: allow single or array
  replyTo: EmailAddressSchema.optional(),
  attachments: z.array(EmailAttachmentSchema).optional(),
  headers: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type EmailAddress = z.infer<typeof EmailAddressSchema>;
export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;
export type SendEmailOptions = z.infer<typeof SendEmailOptionsSchema>;

export interface EmailSendResult {
  messageId: string;
  success: boolean;
  provider: string;
  timestamp: Date;
  error?: string;
}

export interface IEmailProvider {
  name: string;
  send(options: SendEmailOptions): Promise<EmailSendResult>;
  verifyConnection(): Promise<boolean>;
}
