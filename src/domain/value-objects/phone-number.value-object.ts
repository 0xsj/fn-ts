// src/shared/value-objects/phone-number.value-object.ts
import { z } from 'zod';

export type PhoneNumberType = 'mobile' | 'landline' | 'unknown';

export interface PhoneNumberComponents {
  countryCode: string;
  nationalNumber: string;
  extension?: string;
}

/**
 * PhoneNumber value object with international support
 * Stores numbers in E.164 format internally
 */
export class PhoneNumber {
  // E.164 format: +[country code][national number] (max 15 digits)
  private static readonly E164_REGEX = /^\+[1-9]\d{1,14}$/;
  
  // More permissive input patterns
  private static readonly INPUT_PATTERNS = [
    /^\+?[1-9]\d{0,14}$/,                    // International format
    /^[0-9]{10}$/,                            // US 10-digit
    /^[0-9]{11}$/,                            // With country code
    /^\([0-9]{3}\)\s?[0-9]{3}-?[0-9]{4}$/,   // US formatted
    /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/,          // US with dashes
  ];

  private static readonly EMERGENCY_NUMBERS = new Set([
    '911',    // US/Canada
    '112',    // EU/GSM
    '999',    // UK
    '000',    // Australia
    '110',    // Japan/China Police
    '119',    // Japan/China Fire
    '120',    // China Ambulance
  ]);

  private static readonly US_TOLL_FREE_PREFIXES = [
    '800', '833', '844', '855', '866', '877', '888'
  ];

  private static readonly schema = z
    .string()
    .min(10, 'Phone number too short')
    .max(15, 'Phone number too long')
    .transform((val) => PhoneNumber.normalize(val))
    .refine(
      (val) => PhoneNumber.E164_REGEX.test(val),
      { message: 'Invalid phone number format' }
    );

  private readonly value: string;
  private readonly components: PhoneNumberComponents;

  constructor(value: string, defaultCountryCode: string = '1') {
    const normalized = PhoneNumber.normalizeWithDefault(value, defaultCountryCode);
    const result = PhoneNumber.schema.safeParse(normalized);
    
    if (!result.success) {
      throw new Error(`Invalid phone number: ${result.error.errors[0].message}`);
    }
    
    this.value = result.data;
    this.components = PhoneNumber.parseE164(this.value);
  }

  /**
   * Normalize phone number to E.164 format
   */
  private static normalize(value: string): string {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Normalize with default country code
   */
  private static normalizeWithDefault(value: string, defaultCountryCode: string): string {
    // Handle emergency numbers
    const digitsOnly = value.replace(/\D/g, '');
    if (PhoneNumber.EMERGENCY_NUMBERS.has(digitsOnly)) {
      return '+' + defaultCountryCode + digitsOnly;
    }

    let cleaned = value.replace(/[^\d+]/g, '');
    
    // If no country code, add default
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        // Assume it needs country code
        cleaned = defaultCountryCode + cleaned;
      }
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Parse E.164 number into components
   */
  private static parseE164(e164: string): PhoneNumberComponents {
    // Remove the + prefix
    const withoutPlus = e164.substring(1);
    
    // Common country codes (this is a simplified version)
    const countryCodePatterns = [
      { code: '1', length: 1 },      // US/Canada
      { code: '44', length: 2 },     // UK
      { code: '33', length: 2 },     // France
      { code: '49', length: 2 },     // Germany
      { code: '81', length: 2 },     // Japan
      { code: '86', length: 2 },     // China
      { code: '91', length: 2 },     // India
      { code: '7', length: 1 },      // Russia
      { code: '55', length: 2 },     // Brazil
      { code: '61', length: 2 },     // Australia
    ];
    
    let countryCode = '';
    let nationalNumber = withoutPlus;
    
    // Try to match country code
    for (const pattern of countryCodePatterns) {
      if (withoutPlus.startsWith(pattern.code)) {
        countryCode = pattern.code;
        nationalNumber = withoutPlus.substring(pattern.length);
        break;
      }
    }
    
    // Default to first digit as country code if no match
    if (!countryCode && withoutPlus.length > 0) {
      countryCode = withoutPlus[0];
      nationalNumber = withoutPlus.substring(1);
    }
    
    return {
      countryCode,
      nationalNumber,
    };
  }

  /**
   * Factory methods
   */
  static create(value: unknown, defaultCountryCode?: string): PhoneNumber {
    if (typeof value !== 'string') {
      throw new Error('Phone number must be a string');
    }
    return new PhoneNumber(value, defaultCountryCode);
  }

  static tryCreate(value: unknown, defaultCountryCode?: string): PhoneNumber | null {
    try {
      return PhoneNumber.create(value, defaultCountryCode);
    } catch {
      return null;
    }
  }

  /**
   * Get the E.164 formatted value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Get components
   */
  getComponents(): PhoneNumberComponents {
    return { ...this.components };
  }

  /**
   * Get country code
   */
  getCountryCode(): string {
    return this.components.countryCode;
  }

  /**
   * Get national number
   */
  getNationalNumber(): string {
    return this.components.nationalNumber;
  }

  /**
   * Format for display
   */
  format(style: 'international' | 'national' | 'e164' = 'international'): string {
    switch (style) {
      case 'e164':
        return this.value;
      
      case 'international':
        return this.formatInternational();
      
      case 'national':
        return this.formatNational();
      
      default:
        return this.value;
    }
  }

  /**
   * Format as international number
   */
  private formatInternational(): string {
    const { countryCode, nationalNumber } = this.components;
    
    // US/Canada formatting
    if (countryCode === '1' && nationalNumber.length === 10) {
      const area = nationalNumber.substring(0, 3);
      const exchange = nationalNumber.substring(3, 6);
      const subscriber = nationalNumber.substring(6);
      return `+1 (${area}) ${exchange}-${subscriber}`;
    }
    
    // Generic international format
    return `+${countryCode} ${nationalNumber}`;
  }

  /**
   * Format as national number
   */
  private formatNational(): string {
    const { countryCode, nationalNumber } = this.components;
    
    // US/Canada formatting
    if (countryCode === '1' && nationalNumber.length === 10) {
      const area = nationalNumber.substring(0, 3);
      const exchange = nationalNumber.substring(3, 6);
      const subscriber = nationalNumber.substring(6);
      return `(${area}) ${exchange}-${subscriber}`;
    }
    
    // Default national format
    return nationalNumber;
  }

  /**
   * Get masked version for privacy
   */
  getMasked(): string {
    const { countryCode, nationalNumber } = this.components;
    if (nationalNumber.length <= 4) {
      return `+${countryCode} ${'*'.repeat(nationalNumber.length)}`;
    }
    
    const lastFour = nationalNumber.slice(-4);
    const maskedLength = nationalNumber.length - 4;
    return `+${countryCode} ${'*'.repeat(maskedLength)}${lastFour}`;
  }

  /**
   * Check phone type
   */
  getType(): PhoneNumberType {
    // This is a simplified check - real implementation would need carrier lookup
    const { countryCode, nationalNumber } = this.components;
    
    // US toll-free numbers
    if (countryCode === '1' && nationalNumber.length === 10) {
      const areaCode = nationalNumber.substring(0, 3);
      if (PhoneNumber.US_TOLL_FREE_PREFIXES.includes(areaCode)) {
        return 'landline';
      }
    }
    
    // Default to unknown without carrier lookup
    return 'unknown';
  }

  /**
   * Check if emergency number
   */
  isEmergencyNumber(): boolean {
    const withoutCountry = this.components.nationalNumber;
    return PhoneNumber.EMERGENCY_NUMBERS.has(withoutCountry) ||
           PhoneNumber.EMERGENCY_NUMBERS.has(this.components.nationalNumber.slice(-3));
  }

  /**
   * Check if toll-free
   */
  isTollFree(): boolean {
    const { countryCode, nationalNumber } = this.components;
    
    // US toll-free
    if (countryCode === '1' && nationalNumber.length === 10) {
      const areaCode = nationalNumber.substring(0, 3);
      return PhoneNumber.US_TOLL_FREE_PREFIXES.includes(areaCode);
    }
    
    return false;
  }

  /**
   * Check if SMS capable (simplified)
   */
  isSmsCapable(): boolean {
    // Emergency numbers typically can't receive SMS
    if (this.isEmergencyNumber()) return false;
    
    // Most numbers can receive SMS in modern networks
    // Real implementation would need carrier lookup
    return true;
  }

  /**
   * Equality check
   */
  equals(other: PhoneNumber | string): boolean {
    const otherValue = other instanceof PhoneNumber 
      ? other.value 
      : PhoneNumber.normalize(other);
    return this.value === otherValue;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.format('international');
  }

  toJSON(): string {
    return this.value;
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: unknown, defaultCountryCode?: string): PhoneNumber {
    return PhoneNumber.create(json, defaultCountryCode);
  }

  /**
   * Validation without creating instance
   */
  static isValid(value: unknown, defaultCountryCode: string = '1'): boolean {
    if (typeof value !== 'string') return false;
    try {
      const normalized = PhoneNumber.normalizeWithDefault(value, defaultCountryCode);
      return PhoneNumber.schema.safeParse(normalized).success;
    } catch {
      return false;
    }
  }

  /**
   * Get calling code for display (e.g., "+1", "+44")
   */
  getCallingCode(): string {
    return `+${this.components.countryCode}`;
  }

  /**
   * Check if number is from specific country
   */
  isFromCountry(countryCode: string): boolean {
    return this.components.countryCode === countryCode.replace('+', '');
  }
}

// Zod schema for validation in other schemas
export const PhoneNumberSchema = z
  .string()
  .transform((val) => new PhoneNumber(val));