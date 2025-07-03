// src/infrastructure/integrations/email/__tests__/smtp.provider.test.ts
import 'reflect-metadata';
import { SmtpProvider } from '../providers/smtp.provider';
import { SendEmailOptions } from '../types';
import { config } from '../../../../core/config';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('SmtpProvider', () => {
  let smtpProvider: SmtpProvider;
  let mockTransporter: any;
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock sendMail function
    mockSendMail = jest.fn();

    // Create mock transporter
    mockTransporter = {
      sendMail: mockSendMail,
      verify: jest.fn(),
    };

    // Mock createTransport to return our mock transporter
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Create provider instance
    smtpProvider = new SmtpProvider();
  });

  describe('constructor', () => {
    it('should create transporter with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
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
    });
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'test@example.com', name: 'Test User' },
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
      };

      const mockMessageId = 'mock-message-id-123';
      mockSendMail.mockResolvedValueOnce({ messageId: mockMessageId });

      // Act
      const result = await smtpProvider.send(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(mockMessageId);
      expect(result.provider).toBe('smtp');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();

      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${config.services.email.from.name}" <${config.services.email.from.email}>`,
        to: '"Test User" <test@example.com>',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
        cc: undefined,
        bcc: undefined,
        replyTo: undefined,
        attachments: undefined,
        headers: undefined,
      });
    });

    it('should send email without recipient name', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'test@example.com' },
        subject: 'Test Email',
        text: 'This is a test email',
      };

      const mockMessageId = 'mock-message-id-123';
      mockSendMail.mockResolvedValueOnce({ messageId: mockMessageId });

      // Act
      const result = await smtpProvider.send(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
        }),
      );
    });

    it('should handle multiple recipients', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: [
          { email: 'user1@example.com', name: 'User One' },
          { email: 'user2@example.com', name: 'User Two' },
        ],
        subject: 'Multiple Recipients Test',
        text: 'Test content',
      };

      mockSendMail.mockResolvedValueOnce({ messageId: 'mock-id' });

      // Act
      await smtpProvider.send(emailOptions);

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['"User One" <user1@example.com>', '"User Two" <user2@example.com>'],
        }),
      );
    });

    it('should use custom from address when provided', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'test@example.com' },
        from: { email: 'custom@sender.com', name: 'Custom Sender' },
        subject: 'Custom From Test',
        text: 'Test',
      };

      mockSendMail.mockResolvedValueOnce({ messageId: 'mock-id' });

      // Act
      await smtpProvider.send(emailOptions);

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Custom Sender" <custom@sender.com>',
        }),
      );
    });

    it('should handle send failures', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'test@example.com' },
        subject: 'Failure Test',
        text: 'This should fail',
      };

      const error = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValueOnce(error);

      // Act
      const result = await smtpProvider.send(emailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
      expect(result.messageId).toBe('');
      expect(result.provider).toBe('smtp');
    });

    it('should handle attachments', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'test@example.com' },
        subject: 'Attachment Test',
        text: 'Email with attachment',
        attachments: [
          {
            filename: 'test.pdf',
            content: Buffer.from('PDF content'),
            type: 'application/pdf',
            disposition: 'attachment', // Fixed: Added required disposition field
          },
        ],
      };

      mockSendMail.mockResolvedValueOnce({ messageId: 'mock-id' });

      // Act
      await smtpProvider.send(emailOptions);

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: 'test.pdf',
              content: Buffer.from('PDF content'),
              contentType: 'application/pdf',
              cid: undefined,
              encoding: undefined,
            },
          ],
        }),
      );
    });

    it('should handle inline attachments with contentId', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'test@example.com' },
        subject: 'Inline Image Test',
        html: '<p>Here is an inline image: <img src="cid:logo123" /></p>',
        attachments: [
          {
            filename: 'logo.png',
            content: Buffer.from('PNG data'),
            type: 'image/png',
            disposition: 'inline', // For inline images
            contentId: 'logo123', // Referenced in HTML
          },
        ],
      };

      mockSendMail.mockResolvedValueOnce({ messageId: 'mock-id' });

      // Act
      await smtpProvider.send(emailOptions);

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: 'logo.png',
              content: Buffer.from('PNG data'),
              contentType: 'image/png',
              cid: 'logo123',
              encoding: undefined,
            },
          ],
        }),
      );
    });

    it('should handle CC and BCC recipients', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'test@example.com' },
        cc: [{ email: 'cc@example.com', name: 'CC User' }],
        bcc: [{ email: 'bcc@example.com' }],
        subject: 'CC/BCC Test',
        text: 'Test',
      };

      mockSendMail.mockResolvedValueOnce({ messageId: 'mock-id' });

      // Act
      await smtpProvider.send(emailOptions);

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: '"CC User" <cc@example.com>',
          bcc: 'bcc@example.com',
        }),
      );
    });
  });

  describe('verifyConnection', () => {
    it('should verify connection successfully', async () => {
      // Arrange
      mockTransporter.verify.mockResolvedValueOnce(true);

      // Act
      const result = await smtpProvider.verifyConnection();

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should handle connection verification failure', async () => {
      // Arrange
      mockTransporter.verify.mockRejectedValueOnce(new Error('Connection failed'));

      // Act
      const result = await smtpProvider.verifyConnection();

      // Assert
      expect(result).toBe(false);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });
  });
});
