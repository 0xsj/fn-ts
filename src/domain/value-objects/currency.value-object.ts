// src/shared/value-objects/currency.value-object.ts
import { z } from 'zod';

/**
 * ISO 4217 Currency Codes (subset of common currencies)
 */
export const CURRENCY_CODES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 },
  BTC: { code: 'BTC', symbol: '₿', name: 'Bitcoin', decimals: 8 },
} as const;

export type CurrencyCode = keyof typeof CURRENCY_CODES;

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Currency value object for handling monetary values with precision
 * Stores amounts as integers to avoid floating point issues
 */
export class Currency {
  private static readonly VALID_CURRENCY_REGEX = /^[A-Z]{3}$/;
  
  private readonly cents: bigint; // Store as smallest unit to avoid float issues
  private readonly currencyInfo: CurrencyInfo;

  /**
   * Create a Currency instance
   * @param amount - The monetary amount
   * @param currencyCode - ISO 4217 currency code
   */
  constructor(amount: number | string | bigint, currencyCode: CurrencyCode | string) {
    // Validate currency
    const currencyInfo = Currency.getCurrencyInfo(currencyCode);
    if (!currencyInfo) {
      throw new Error(`Invalid currency code: ${currencyCode}`);
    }
    this.currencyInfo = currencyInfo;

    // Convert amount to cents/smallest unit
    this.cents = Currency.amountToCents(amount, this.currencyInfo.decimals);
    
    // Validate amount
    if (this.cents < 0n) {
      throw new Error('Currency amount cannot be negative');
    }
  }

  /**
   * Get currency info
   */
  private static getCurrencyInfo(code: string): CurrencyInfo | null {
    const upperCode = code.toUpperCase();
    
    // Check predefined currencies
    if (upperCode in CURRENCY_CODES) {
      return CURRENCY_CODES[upperCode as CurrencyCode];
    }
    
    // For unknown currencies, validate format and use defaults
    if (Currency.VALID_CURRENCY_REGEX.test(upperCode)) {
      return {
        code: upperCode,
        symbol: upperCode,
        name: upperCode,
        decimals: 2, // Default to 2 decimal places
      };
    }
    
    return null;
  }

  /**
   * Convert amount to smallest unit (cents)
   */
  private static amountToCents(amount: number | string | bigint, decimals: number): bigint {
    if (typeof amount === 'bigint') {
      return amount;
    }

    const multiplier = Math.pow(10, decimals);
    
    if (typeof amount === 'number') {
      // Avoid floating point issues by rounding
      return BigInt(Math.round(amount * multiplier));
    }
    
    // String amount
    const cleanAmount = amount.replace(/[^0-9.-]/g, '');
    const parts = cleanAmount.split('.');
    
    if (parts.length === 1) {
      // No decimal part
      return BigInt(parts[0]) * BigInt(multiplier);
    }
    
    // Handle decimal part
    const integerPart = BigInt(parts[0] || '0');
    let decimalPart = parts[1] || '';
    
    // Pad or truncate decimal part
    if (decimalPart.length > decimals) {
      decimalPart = decimalPart.substring(0, decimals);
    } else {
      decimalPart = decimalPart.padEnd(decimals, '0');
    }
    
    return integerPart * BigInt(multiplier) + BigInt(decimalPart);
  }

  /**
   * Factory methods
   */
  static create(amount: number | string, currencyCode: CurrencyCode | string): Currency {
    return new Currency(amount, currencyCode);
  }

  static zero(currencyCode: CurrencyCode | string): Currency {
    return new Currency(0, currencyCode);
  }

  static fromCents(cents: number | bigint, currencyCode: CurrencyCode | string): Currency {
    const currencyInfo = Currency.getCurrencyInfo(currencyCode);
    if (!currencyInfo) {
      throw new Error(`Invalid currency code: ${currencyCode}`);
    }
    
    const currency = Object.create(Currency.prototype) as Currency;
    (currency as any).cents = BigInt(cents);
    (currency as any).currencyInfo = currencyInfo;
    return currency;
  }

  /**
   * Get the amount as a number
   */
  getAmount(): number {
    const divisor = Math.pow(10, this.currencyInfo.decimals);
    return Number(this.cents) / divisor;
  }

  /**
   * Get the amount in cents/smallest unit
   */
  getCents(): bigint {
    return this.cents;
  }

  /**
   * Get currency code
   */
  getCurrencyCode(): string {
    return this.currencyInfo.code;
  }

  /**
   * Get currency info
   */
  getCurrencyInfo(): CurrencyInfo {
    return { ...this.currencyInfo };
  }

  /**
   * Arithmetic operations
   */
  add(other: Currency): Currency {
    this.assertSameCurrency(other);
    return Currency.fromCents(this.cents + other.cents, this.currencyInfo.code);
  }

  subtract(other: Currency): Currency {
    this.assertSameCurrency(other);
    const result = this.cents - other.cents;
    if (result < 0n) {
      throw new Error('Subtraction would result in negative amount');
    }
    return Currency.fromCents(result, this.currencyInfo.code);
  }

  multiply(factor: number): Currency {
    if (factor < 0) {
      throw new Error('Cannot multiply by negative factor');
    }
    const result = BigInt(Math.round(Number(this.cents) * factor));
    return Currency.fromCents(result, this.currencyInfo.code);
  }

  divide(divisor: number): Currency {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    if (divisor < 0) {
      throw new Error('Cannot divide by negative divisor');
    }
    const result = BigInt(Math.round(Number(this.cents) / divisor));
    return Currency.fromCents(result, this.currencyInfo.code);
  }

  /**
   * Percentage operations
   */
  percentage(percent: number): Currency {
    return this.multiply(percent / 100);
  }

  /**
   * Comparison operations
   */
  equals(other: Currency): boolean {
    return this.cents === other.cents && this.currencyInfo.code === other.currencyInfo.code;
  }

  lessThan(other: Currency): boolean {
    this.assertSameCurrency(other);
    return this.cents < other.cents;
  }

  lessThanOrEqual(other: Currency): boolean {
    this.assertSameCurrency(other);
    return this.cents <= other.cents;
  }

  greaterThan(other: Currency): boolean {
    this.assertSameCurrency(other);
    return this.cents > other.cents;
  }

  greaterThanOrEqual(other: Currency): boolean {
    this.assertSameCurrency(other);
    return this.cents >= other.cents;
  }

  isZero(): boolean {
    return this.cents === 0n;
  }

  isPositive(): boolean {
    return this.cents > 0n;
  }

  /**
   * Formatting
   */
  format(options?: {
    symbol?: boolean;
    thousandsSeparator?: boolean;
    decimalSeparator?: string;
    symbolPosition?: 'before' | 'after';
  }): string {
    const {
      symbol = true,
      thousandsSeparator = true,
      decimalSeparator = '.',
      symbolPosition = 'before',
    } = options || {};

    const amount = this.getAmount();
    const fixed = amount.toFixed(this.currencyInfo.decimals);
    
    let [integerPart, decimalPart] = fixed.split('.');
    
    // Add thousands separator
    if (thousandsSeparator && integerPart.length > 3) {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Build the formatted string
    let formatted = integerPart;
    if (this.currencyInfo.decimals > 0 && decimalPart) {
      formatted += decimalSeparator + decimalPart;
    }
    
    // Add currency symbol
    if (symbol) {
      if (symbolPosition === 'before') {
        formatted = this.currencyInfo.symbol + formatted;
      } else {
        formatted = formatted + ' ' + this.currencyInfo.symbol;
      }
    } else {
      formatted = formatted + ' ' + this.currencyInfo.code;
    }
    
    return formatted;
  }

  /**
   * Format for display in specific locale
   */
  toLocaleString(locale: string = 'en-US', options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currencyInfo.code,
      minimumFractionDigits: this.currencyInfo.decimals,
      maximumFractionDigits: this.currencyInfo.decimals,
      ...options,
    }).format(this.getAmount());
  }

  /**
   * Round to nearest unit
   */
  round(precision: number = 0): Currency {
    const factor = Math.pow(10, precision);
    const amount = Math.round(this.getAmount() * factor) / factor;
    return new Currency(amount, this.currencyInfo.code);
  }

  /**
   * Allocate currency proportionally
   * Useful for splitting bills, distributing costs, etc.
   */
  allocate(ratios: number[]): Currency[] {
    const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
    if (total === 0) {
      throw new Error('Sum of ratios must be greater than zero');
    }

    const results: Currency[] = [];
    let remaining = this.cents;

    for (let i = 0; i < ratios.length - 1; i++) {
      const share = (this.cents * BigInt(Math.round(ratios[i] * 1000000))) / BigInt(Math.round(total * 1000000));
      results.push(Currency.fromCents(share, this.currencyInfo.code));
      remaining -= share;
    }

    // Last allocation gets the remainder to avoid rounding issues
    results.push(Currency.fromCents(remaining, this.currencyInfo.code));

    return results;
  }

  /**
   * Helper to assert same currency
   */
  private assertSameCurrency(other: Currency): void {
    if (this.currencyInfo.code !== other.currencyInfo.code) {
      throw new Error(
        `Cannot perform operation with different currencies: ${this.currencyInfo.code} and ${other.currencyInfo.code}`
      );
    }
  }

  /**
   * Serialization
   */
  toString(): string {
    return this.format();
  }

  toJSON(): { amount: string; currency: string } {
    return {
      amount: this.getAmount().toFixed(this.currencyInfo.decimals),
      currency: this.currencyInfo.code,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: { amount: string | number; currency: string }): Currency {
    return new Currency(json.amount, json.currency);
  }

  /**
   * Validation
   */
  static isValidCurrencyCode(code: string): boolean {
    return Currency.getCurrencyInfo(code) !== null;
  }

  static isValidAmount(amount: unknown): boolean {
    if (typeof amount === 'number') {
      return !isNaN(amount) && isFinite(amount) && amount >= 0;
    }
    if (typeof amount === 'string') {
      const num = parseFloat(amount.replace(/[^0-9.-]/g, ''));
      return !isNaN(num) && num >= 0;
    }
    if (typeof amount === 'bigint') {
      return amount >= 0n;
    }
    return false;
  }
}

// Zod schema for validation
export const CurrencySchema = z.object({
  amount: z.union([z.string(), z.number()]),
  currency: z.string().length(3).toUpperCase(),
}).transform(data => Currency.fromJSON(data));