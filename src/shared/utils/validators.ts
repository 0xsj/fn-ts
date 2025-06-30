// src/shared/utils/validators.ts
import { z } from 'zod';

/**
 * Common validation utilities
 */
export const validators = {
  /**
   * UUID v4 validation
   */
  isValidUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  /**
   * Email validation (uses Zod for consistency)
   */
  isValidEmail: (value: string): boolean => {
    return z.string().email().safeParse(value).success;
  },

  /**
   * Phone number validation (basic)
   */
  isValidPhone: (value: string): boolean => {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
  },

  /**
   * Password strength validation
   */
  isValidPassword: (value: string): boolean => {
    return z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number')
      .safeParse(value).success;
  },

  /**
   * JWT token format validation (basic structure check)
   */
  isValidJWT: (value: string): boolean => {
    const parts = value.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  },

  /**
   * Session token validation (your custom format)
   */
  isValidSessionToken: (value: string): boolean => {
    // Adjust based on your token format
    return value.length >= 32 && /^[A-Za-z0-9_-]+$/.test(value);
  },
};