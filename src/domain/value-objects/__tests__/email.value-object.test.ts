// src/shared/value-objects/__tests__/email.value-object.test.ts
import { Email } from '../email.value-object';

describe('Email Value Object', () => {
  describe('constructor', () => {
    it('should create valid email', () => {
      const email = new Email('test@example.com');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should normalize email to lowercase', () => {
      const email = new Email('Test@EXAMPLE.COM');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test..double@example.com',
        '.test@example.com',
        'test.@example.com',
        'test@example',
        'test@.example.com',
        'test@example..com',
        'test@example.com.',
        'test with spaces@example.com',
        'test@ex ample.com',
        '',
        'a'.repeat(65) + '@example.com', // local part too long
        'test@' + 'a'.repeat(254) + '.com', // domain too long
      ];

      invalidEmails.forEach(invalid => {
        expect(() => new Email(invalid)).toThrow('Invalid email');
      });
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'simple@example.com',
        'very.common@example.com',
        'disposable.style.email.with+symbol@example.com',
        'other.email-with-hyphen@example.com',
        'fully-qualified-domain@example.com',
        'user.name+tag+sorting@example.com',
        'x@example.com', // one-letter local part
        'example-indeed@strange-example.com',
        'example@s.example', // short domain
        'user-@example.org',
        'user_name@example.org',
      ];

      validEmails.forEach(valid => {
        expect(() => new Email(valid)).not.toThrow();
      });
    });

    it('should enforce RFC 5321 length limits', () => {
      // Max local part: 64 characters
      const maxLocal = 'a'.repeat(64) + '@example.com';
      expect(() => new Email(maxLocal)).not.toThrow();

      // Max total length: 254 characters
      const maxTotal = 'a'.repeat(64) + '@' + 'b'.repeat(184) + '.com';
      expect(() => new Email(maxTotal)).not.toThrow();
    });
  });

  describe('create factory method', () => {
    it('should create email from string', () => {
      const email = Email.create('test@example.com');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should throw for non-string input', () => {
      expect(() => Email.create(123)).toThrow('Email must be a string');
      expect(() => Email.create(null)).toThrow('Email must be a string');
      expect(() => Email.create(undefined)).toThrow('Email must be a string');
      expect(() => Email.create({})).toThrow('Email must be a string');
    });
  });

  describe('tryCreate', () => {
    it('should return Email instance for valid email', () => {
      const email = Email.tryCreate('test@example.com');
      expect(email).toBeInstanceOf(Email);
      expect(email?.getValue()).toBe('test@example.com');
    });

    it('should return null for invalid email', () => {
      expect(Email.tryCreate('invalid')).toBeNull();
      expect(Email.tryCreate(123)).toBeNull();
      expect(Email.tryCreate(null)).toBeNull();
    });
  });

  describe('domain operations', () => {
    const email = new Email('user@example.com');

    it('should get domain', () => {
      expect(email.getDomain()).toBe('example.com');
    });

    it('should get local part', () => {
      expect(email.getLocalPart()).toBe('user');
    });

    it('should check if from specific domain', () => {
      expect(email.isFromDomain('example.com')).toBe(true);
      expect(email.isFromDomain('EXAMPLE.COM')).toBe(true);
      expect(email.isFromDomain('other.com')).toBe(false);
    });

    it('should check if from multiple domains', () => {
      expect(email.isFromDomains(['example.com', 'test.com'])).toBe(true);
      expect(email.isFromDomains(['other.com', 'test.com'])).toBe(false);
    });
  });

  describe('email masking', () => {
    it('should mask normal emails', () => {
      expect(new Email('john@example.com').getMasked()).toBe('j***n@example.com');
      expect(new Email('alice@example.com').getMasked()).toBe('a***e@example.com');
      expect(new Email('support@example.com').getMasked()).toBe('s***t@example.com');
    });

    it('should mask short local parts', () => {
      expect(new Email('ab@example.com').getMasked()).toBe('**@example.com');
      expect(new Email('a@example.com').getMasked()).toBe('**@example.com');
    });

    it('should limit mask length', () => {
      expect(new Email('verylongemailaddress@example.com').getMasked()).toBe('v***s@example.com');
    });
  });

  describe('email classification', () => {
    it('should identify personal emails', () => {
      const personalEmails = [
        'user@gmail.com',
        'user@yahoo.com',
        'user@hotmail.com',
        'user@outlook.com',
        'user@icloud.com',
      ];

      personalEmails.forEach(email => {
        const emailObj = new Email(email);
        expect(emailObj.isPersonalEmail()).toBe(true);
        expect(emailObj.isBusinessEmail()).toBe(false);
      });
    });

    it('should identify business emails', () => {
      const businessEmails = [
        'user@company.com',
        'user@organization.org',
        'user@business.net',
      ];

      businessEmails.forEach(email => {
        const emailObj = new Email(email);
        expect(emailObj.isPersonalEmail()).toBe(false);
        expect(emailObj.isBusinessEmail()).toBe(true);
      });
    });

    it('should identify no-reply emails', () => {
      const noReplyEmails = [
        'noreply@example.com',
        'no-reply@example.com',
        'donotreply@example.com',
        'system-noreply@example.com',
      ];

      noReplyEmails.forEach(email => {
        expect(new Email(email).isNoReply()).toBe(true);
      });

      expect(new Email('support@example.com').isNoReply()).toBe(false);
      expect(new Email('reply@example.com').isNoReply()).toBe(false);
    });
  });

  describe('equality', () => {
    it('should compare emails case-insensitively', () => {
      const email1 = new Email('test@example.com');
      const email2 = new Email('TEST@EXAMPLE.COM');

      expect(email1.equals(email2)).toBe(true);
      expect(email1.equals('TEST@EXAMPLE.COM')).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = new Email('test1@example.com');
      const email2 = new Email('test2@example.com');

      expect(email1.equals(email2)).toBe(false);
    });
  });

  describe('serialization', () => {
    const email = new Email('test@example.com');

    it('should convert to string', () => {
      expect(email.toString()).toBe('test@example.com');
      expect(String(email)).toBe('test@example.com');
    });

    it('should serialize to JSON', () => {
      expect(email.toJSON()).toBe('test@example.com');
      expect(JSON.stringify({ email })).toBe('{"email":"test@example.com"}');
    });

    it('should deserialize from JSON', () => {
      const deserialized = Email.fromJSON('test@example.com');
      expect(deserialized.getValue()).toBe('test@example.com');
    });
  });

  describe('static validation', () => {
    it('should validate without creating instance', () => {
      expect(Email.isValid('test@example.com')).toBe(true);
      expect(Email.isValid('invalid-email')).toBe(false);
      expect(Email.isValid(123)).toBe(false);
      expect(Email.isValid(null)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle emails with multiple @ symbols', () => {
      expect(() => new Email('test@@example.com')).toThrow();
      expect(() => new Email('test@exam@ple.com')).toThrow();
    });

    it('should handle emails with special characters', () => {
      // Valid special characters in local part
      expect(() => new Email('test+tag@example.com')).not.toThrow();
      expect(() => new Email('test_underscore@example.com')).not.toThrow();
      expect(() => new Email('test-hyphen@example.com')).not.toThrow();
      expect(() => new Email('test.dot@example.com')).not.toThrow();
    });

    it('should handle international domains', () => {
      expect(() => new Email('test@münchen.de')).not.toThrow();
      expect(() => new Email('test@xn--mnchen-3ya.de')).not.toThrow(); // punycode
    });
  });
});