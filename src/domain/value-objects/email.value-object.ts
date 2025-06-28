// src/shared/value-objects/email.value-object.ts
import { z } from 'zod';

/**
 * Email value object with validation and normalization
 */
export class Email {
  // More permissive email regex that supports international domains
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  private static readonly schema = z
    .string()
    .toLowerCase()
    .max(254) // RFC 5321
    .refine(
      (email) => {
        // Basic format check
        if (!Email.EMAIL_REGEX.test(email)) return false;
        
        // Additional validation for common issues
        const parts = email.split('@');
        if (parts.length !== 2) return false;
        
        const [localPart, domain] = parts;
        
        // Local part validation
        if (localPart.length === 0 || localPart.length > 64) return false; // RFC 5321
        if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
        if (localPart.includes('..')) return false;
        
        // Domain validation
        if (domain.length === 0 || domain.length > 253) return false;
        if (domain.startsWith('.') || domain.endsWith('.')) return false;
        if (domain.includes('..')) return false;
        if (!domain.includes('.')) return false;
        
        // Check for spaces
        if (email.includes(' ')) return false;
        
        return true;
      },
      { message: 'Invalid email format' }
    );

  private readonly value: string;

  constructor(value: string) {
    const result = Email.schema.safeParse(value);
    if (!result.success) {
      throw new Error(`Invalid email: ${result.error.errors[0].message}`);
    }
    this.value = result.data;
  }

  /**
   * Factory method for creating Email from unknown input
   */
  static create(value: unknown): Email {
    if (typeof value !== 'string') {
      throw new Error('Email must be a string');
    }
    return new Email(value);
  }

  /**
   * Try to create an Email, returning null if invalid
   */
  static tryCreate(value: unknown): Email | null {
    try {
      return Email.create(value);
    } catch {
      return null;
    }
  }

  /**
   * Get the email value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Get the domain part of the email
   */
  getDomain(): string {
    return this.value.split('@')[1];
  }

  /**
   * Get the local part (username) of the email
   */
  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  /**
   * Check if email is from a specific domain
   */
  isFromDomain(domain: string): boolean {
    return this.getDomain().toLowerCase() === domain.toLowerCase();
  }

  /**
   * Check if email is from any of the specified domains
   */
  isFromDomains(domains: string[]): boolean {
    const emailDomain = this.getDomain().toLowerCase();
    return domains.some(d => d.toLowerCase() === emailDomain);
  }

  /**
   * Get a masked version of the email for display
   * Example: j***n@example.com
   */
  getMasked(): string {
    const localPart = this.getLocalPart();
    const domain = this.getDomain();
    
    if (localPart.length <= 2) {
      return `**@${domain}`;
    }
    
    const firstChar = localPart[0];
    const lastChar = localPart[localPart.length - 1];
    const asterisks = '*'.repeat(3);
    
    return `${firstChar}${asterisks}${lastChar}@${domain}`;
  }

  /**
   * Check if this email equals another email (case-insensitive)
   */
  equals(other: Email | string): boolean {
    const otherValue = other instanceof Email ? other.value : other.toLowerCase();
    return this.value === otherValue;
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * For JSON serialization
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * Create Email from JSON
   */
  static fromJSON(json: unknown): Email {
    return Email.create(json);
  }

  /**
   * Validate without creating an instance
   */
  static isValid(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return Email.schema.safeParse(value).success;
  }

  /**
   * Common email domain checks
   */
  isPersonalEmail(): boolean {
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'
    ];
    return this.isFromDomains(personalDomains);
  }

  isBusinessEmail(): boolean {
    return !this.isPersonalEmail();
  }

  /**
   * Check if email is a no-reply address
   */
  isNoReply(): boolean {
    const localPart = this.getLocalPart().toLowerCase();
    return localPart.includes('noreply') || 
           localPart.includes('no-reply') || 
           localPart.includes('donotreply');
  }

  /**
   * Check if the email uses Punycode (internationalized domain)
   */
  isPunycode(): boolean {
    return this.getDomain().includes('xn--');
  }
}

// Zod schema for validation in other schemas
export const EmailSchema = z.string().transform((val) => new Email(val));