// src/shared/utils/validators.ts
import { z } from 'zod';

/**
 * Common validation utilities
 */
// In src/shared/utils/validators.ts

export const validators = {
  isValidUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  isValidEmail: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  isValidPhone: (value: string): boolean => {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
  },

  isValidPassword: (value: string): boolean => {
    // Basic password validation - just length
    return value.length >= 8;
  },

  isStrongPassword: (value: string): boolean => {
    // Strong password validation
    // At least 8 characters
    if (value.length < 8) return false;

    // Contains at least one uppercase letter
    if (!/[A-Z]/.test(value)) return false;

    // Contains at least one lowercase letter
    if (!/[a-z]/.test(value)) return false;

    // Contains at least one number
    if (!/\d/.test(value)) return false;

    // Contains at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return false;

    return true;
  },

  isValidJWT: (value: string): boolean => {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    return jwtRegex.test(value);
  },

  isValidSessionToken: (value: string): boolean => {
    // Session tokens should be hex strings of at least 32 characters
    const hexRegex = /^[a-f0-9]{32,}$/i;
    return hexRegex.test(value);
  },
};
