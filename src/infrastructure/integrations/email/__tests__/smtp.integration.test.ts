// src/infrastructure/integrations/email/__tests__/smtp.provider.integration.test.ts
import 'reflect-metadata';
import { SmtpProvider } from '../providers/smtp.provider';
import { SendEmailOptions } from '../types';
import axios from 'axios';

// Skip these tests in CI or when Mailhog is not available
const MAILHOG_API_URL = 'http://localhost:8025/api/v2';
const SKIP_INTEGRATION = process.env.CI === 'true' || process.env.SKIP_INTEGRATION === 'true';

// Mailhog API types
interface MailhogMessage {
  ID: string;
  From: { Mailbox: string; Domain: string };
  To: Array<{ Mailbox: string; Domain: string }>;
  Content: {
    Headers: {
      Subject: string[];
      To: string[];
      From: string[];
    };
    Body: string;
  };
  MIME: {
    Parts?: Array<{
      Headers: Record<string, string[]>;
      Body: string;
    }>;
  };
  Created: string;
}

interface MailhogResponse {
  total: number;
  count: number;
  start: number;
  items: MailhogMessage[];
}

// Use conditional describe
const describeIntegration = SKIP_INTEGRATION ? describe.skip : describe;

describeIntegration('SmtpProvider Integration Tests', () => {
  let smtpProvider: SmtpProvider;

  beforeAll(() => {
    // Use real SMTP provider
    smtpProvider = new SmtpProvider();
  });

  beforeEach(async () => {
    // Clear Mailhog messages before each test
    try {
      await axios.delete(`${MAILHOG_API_URL}/messages`);
    } catch (error) {
      console.warn('Could not clear Mailhog messages:', error);
    }
  });

  describe('Mailhog Integration', () => {
    it('should send a simple email to Mailhog', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'john.doe@example.com', name: 'John Doe' },
        subject: 'Test Email - Simple',
        text: 'This is a simple test email sent to Mailhog',
        html: `
          <h2>Hello from FireNotifications!</h2>
          <p>This is a test email sent at ${new Date().toISOString()}</p>
          <p>If you can see this in Mailhog, the integration is working!</p>
        `,
      };

      // Act
      const result = await smtpProvider.send(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();

      // Wait a bit for Mailhog to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify email was received by Mailhog
      const response = await axios.get<MailhogResponse>(`${MAILHOG_API_URL}/messages`);
      const messages = response.data.items;

      expect(messages).toHaveLength(1);
      expect(messages[0].Content.Headers.Subject[0]).toBe('Test Email - Simple');
      expect(messages[0].Content.Headers.To[0]).toContain('john.doe@example.com');
    });

    it('should send email with multiple recipients', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: [
          { email: 'user1@example.com', name: 'User One' },
          { email: 'user2@example.com', name: 'User Two' },
        ],
        cc: [{ email: 'cc@example.com', name: 'CC User' }],
        bcc: [{ email: 'bcc@example.com' }],
        subject: 'Test Email - Multiple Recipients',
        html: `
          <h2>Team Update</h2>
          <p>This email was sent to multiple recipients.</p>
          <ul>
            <li>To: User One and User Two</li>
            <li>CC: CC User</li>
            <li>BCC: Hidden recipient</li>
          </ul>
        `,
      };

      // Act
      const result = await smtpProvider.send(emailOptions);

      // Assert
      expect(result.success).toBe(true);

      // Wait for Mailhog
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check Mailhog received it
      const response = await axios.get<MailhogResponse>(`${MAILHOG_API_URL}/messages`);
      expect(response.data.total).toBeGreaterThan(0);
    });

    it('should send email with attachments', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'recipient@example.com', name: 'Test Recipient' },
        subject: 'Test Email - With Attachments',
        html: `
          <h2>Email with Attachments</h2>
          <p>This email includes:</p>
          <ul>
            <li>A text file attachment</li>
            <li>An inline image</li>
          </ul>
          <p>Here's the inline image:</p>
          <img src="cid:testimage" alt="Test Image" />
        `,
        attachments: [
          {
            filename: 'test-document.txt',
            content: Buffer.from('This is the content of the test document.\nLine 2\nLine 3'),
            type: 'text/plain',
            disposition: 'attachment',
          },
          {
            filename: 'pixel.png',
            // 1x1 red pixel PNG
            content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
            type: 'image/png',
            disposition: 'inline',
            contentId: 'testimage',
          },
        ],
      };

      // Act
      const result = await smtpProvider.send(emailOptions);

      // Assert
      expect(result.success).toBe(true);

      // Give Mailhog time to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify in Mailhog
      const response = await axios.get<MailhogResponse>(`${MAILHOG_API_URL}/messages`);
      const message = response.data.items[0];
      
      // Check that the message has attachments
      expect(message.MIME.Parts).toBeTruthy();
      expect(message.MIME.Parts!.length).toBeGreaterThan(1);
    });

    it('should send a fancy HTML email', async () => {
      // Arrange
      const emailOptions: SendEmailOptions = {
        to: { email: 'vip@example.com', name: 'VIP Customer' },
        subject: '🔥 FireNotifications Test - Fancy HTML Email',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
              .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔥 FireNotifications</h1>
                <p>Emergency Alert System Test</p>
              </div>
              <div class="content">
                <h2>Hello VIP Customer!</h2>
                <div class="alert-box">
                  <strong>⚠️ Test Alert:</strong> This is a test of our fancy HTML email system.
                </div>
                <p>This email demonstrates various HTML features:</p>
                <ul>
                  <li>✅ Gradient backgrounds</li>
                  <li>✅ Custom styling</li>
                  <li>✅ Emojis support 🚀</li>
                  <li>✅ Call-to-action buttons</li>
                </ul>
                <center>
                  <a href="http://localhost:8025" class="button">View in Mailhog</a>
                </center>
                <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <div class="footer">
                <p>© 2024 FireNotifications. This is a test email.</p>
                <p>You're receiving this because you're testing the email system.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: 'This is the plain text version of the fancy email. View in HTML for the best experience!',
      };

      // Act
      const result = await smtpProvider.send(emailOptions);

      // Assert
      expect(result.success).toBe(true);
      console.log(`✅ Fancy email sent! Check Mailhog at http://localhost:8025`);
    });
  });

  describe('Connection Tests', () => {
    it('should verify SMTP connection to Mailhog', async () => {
      // Act
      const isConnected = await smtpProvider.verifyConnection();

      // Assert
      expect(isConnected).toBe(true);
    });
  });
});