// src/shared/value-objects/percentage.value-object.ts
import { z } from 'zod';

/**
 * Percentage value object for handling percentage values with precision
 * Supports both decimal (0.15) and percentage (15%) representations
 */
export class Percentage {
  private readonly value: number; // Stored as decimal (0.15 for 15%)

  /**
   * Create a Percentage instance
   * @param value - The percentage value (0-100 for percentage, 0-1 for decimal)
   * @param isDecimal - Whether the input is in decimal form (default: false)
   */
  constructor(value: number | string, isDecimal = false) {
    let decimal: number;

    if (typeof value === 'string') {
      // Remove % sign if present
      const cleaned = value.trim().replace('%', '');
      const parsed = parseFloat(cleaned);
      
      if (isNaN(parsed)) {
        throw new Error('Invalid percentage value');
      }
      
      // If string had %, treat as percentage
      decimal = value.includes('%') ? parsed / 100 : (isDecimal ? parsed : parsed / 100);
    } else {
      if (isNaN(value) || !isFinite(value)) {
        throw new Error('Invalid percentage value');
      }
      decimal = isDecimal ? value : value / 100;
    }

    // Validate range
    if (decimal < 0 || decimal > 1) {
      throw new Error('Percentage must be between 0 and 100');
    }

    this.value = decimal;
  }

  /**
   * Factory methods
   */
  static fromDecimal(decimal: number): Percentage {
    return new Percentage(decimal, true);
  }

  static fromPercentage(percentage: number): Percentage {
    return new Percentage(percentage, false);
  }

  static fromString(value: string): Percentage {
    return new Percentage(value);
  }

  static zero(): Percentage {
    return new Percentage(0, true);
  }

  static hundred(): Percentage {
    return new Percentage(1, true);
  }

  static fifty(): Percentage {
    return new Percentage(0.5, true);
  }

  /**
   * Try to create a Percentage, returning null if invalid
   */
  static tryCreate(value: unknown, isDecimal = false): Percentage | null {
    try {
      if (typeof value === 'string' || typeof value === 'number') {
        return new Percentage(value, isDecimal);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get as decimal (0.15 for 15%)
   */
  toDecimal(): number {
    return this.value;
  }

  /**
   * Get as percentage (15 for 15%)
   */
  toPercentage(): number {
    return this.value * 100;
  }

  /**
   * Get as whole number percentage
   */
  toWholePercentage(): number {
    return Math.round(this.toPercentage());
  }

  /**
   * Get as basis points (1500 for 15%)
   */
  toBasisPoints(): number {
    return Math.round(this.value * 10000);
  }

  /**
   * Arithmetic operations
   */
  add(other: Percentage): Percentage {
    return Percentage.fromDecimal(this.value + other.value);
  }

  subtract(other: Percentage): Percentage {
    const result = this.value - other.value;
    if (result < 0) {
      throw new Error('Subtraction would result in negative percentage');
    }
    return Percentage.fromDecimal(result);
  }

  multiply(factor: number): Percentage {
    if (factor < 0) {
      throw new Error('Cannot multiply by negative factor');
    }
    const result = this.value * factor;
    if (result > 1) {
      throw new Error('Result exceeds 100%');
    }
    return Percentage.fromDecimal(result);
  }

  divide(divisor: number): Percentage {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    if (divisor < 0) {
      throw new Error('Cannot divide by negative divisor');
    }
    return Percentage.fromDecimal(this.value / divisor);
  }

  /**
   * Apply percentage to a value
   */
  of(value: number): number {
    return value * this.value;
  }

  /**
   * Calculate what percentage this is of a value
   */
  static whatPercentOf(part: number, whole: number): Percentage {
    if (whole === 0) {
      throw new Error('Cannot calculate percentage of zero');
    }
    return Percentage.fromDecimal(part / whole);
  }

  /**
   * Invert percentage (100% - x)
   */
  invert(): Percentage {
    return Percentage.fromDecimal(1 - this.value);
  }

  /**
   * Comparison operations
   */
  equals(other: Percentage | number): boolean {
    const otherValue = typeof other === 'number' 
      ? other / 100 
      : other.value;
    return Math.abs(this.value - otherValue) < Number.EPSILON;
  }

  lessThan(other: Percentage | number): boolean {
    const otherValue = typeof other === 'number' 
      ? other / 100 
      : other.value;
    return this.value < otherValue;
  }

  lessThanOrEqual(other: Percentage | number): boolean {
    return this.lessThan(other) || this.equals(other);
  }

  greaterThan(other: Percentage | number): boolean {
    const otherValue = typeof other === 'number' 
      ? other / 100 
      : other.value;
    return this.value > otherValue;
  }

  greaterThanOrEqual(other: Percentage | number): boolean {
    return this.greaterThan(other) || this.equals(other);
  }

  /**
   * Range checks
   */
  isZero(): boolean {
    return this.value === 0;
  }

  isHundred(): boolean {
    return this.value === 1;
  }

  isBetween(min: Percentage | number, max: Percentage | number): boolean {
    return this.greaterThanOrEqual(min) && this.lessThanOrEqual(max);
  }

  /**
   * Formatting
   */
  format(options?: {
    decimals?: number;
    includeSign?: boolean;
    locale?: string;
  }): string {
    const {
      decimals = 2,
      includeSign = true,
      locale = 'en-US',
    } = options || {};

    const percentage = this.toPercentage();
    const formatted = percentage.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return includeSign ? `${formatted}%` : formatted;
  }

  /**
   * Format as change/delta
   */
  formatChange(options?: {
    decimals?: number;
    showPlus?: boolean;
    locale?: string;
  }): string {
    const {
      decimals = 2,
      showPlus = true,
      locale = 'en-US',
    } = options || {};

    const percentage = this.toPercentage();
    const sign = percentage > 0 && showPlus ? '+' : '';
    
    return `${sign}${percentage.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}%`;
  }

  /**
   * Round to specified decimal places
   */
  round(decimals = 2): Percentage {
    const factor = Math.pow(10, decimals);
    const rounded = Math.round(this.toPercentage() * factor) / factor;
    return Percentage.fromPercentage(rounded);
  }

  /**
   * Clamp between min and max
   */
  clamp(min: Percentage | number, max: Percentage | number): Percentage {
    const minValue = typeof min === 'number' ? min / 100 : min.value;
    const maxValue = typeof max === 'number' ? max / 100 : max.value;
    
    if (this.value < minValue) {
      return Percentage.fromDecimal(minValue);
    }
    if (this.value > maxValue) {
      return Percentage.fromDecimal(maxValue);
    }
    return this;
  }

  /**
   * Serialization
   */
  toString(): string {
    return this.format();
  }

  toJSON(): { value: number; format: string } {
    return {
      value: this.toPercentage(),
      format: 'percentage',
    };
  }

  static fromJSON(json: { value: number; format?: string }): Percentage {
    const isDecimal = json.format === 'decimal';
    return new Percentage(json.value, isDecimal);
  }

  /**
   * Validation
   */
  static isValid(value: unknown, isDecimal = false): boolean {
    try {
      if (typeof value === 'number') {
        const decimal = isDecimal ? value : value / 100;
        return decimal >= 0 && decimal <= 1 && isFinite(decimal);
      }
      if (typeof value === 'string') {
        new Percentage(value);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Common percentages
   */
  static readonly ZERO = new Percentage(0, true);
  static readonly FIVE = new Percentage(0.05, true);
  static readonly TEN = new Percentage(0.1, true);
  static readonly QUARTER = new Percentage(0.25, true);
  static readonly THIRD = new Percentage(0.3333, true);
  static readonly HALF = new Percentage(0.5, true);
  static readonly TWO_THIRDS = new Percentage(0.6667, true);
  static readonly THREE_QUARTERS = new Percentage(0.75, true);
  static readonly HUNDRED = new Percentage(1, true);
}

// Zod schemas
export const PercentageSchema = z.union([
  z.number().min(0).max(100),
  z.string().regex(/^\d+(\.\d+)?%?$/),
]).transform(val => new Percentage(val));

export const DecimalPercentageSchema = z
  .number()
  .min(0)
  .max(1)
  .transform(val => Percentage.fromDecimal(val));