// src/shared/value-objects/__tests__/currency.value-object.test.ts
import { Currency } from '../currency.value-object';

describe('Currency Value Object', () => {
  describe('constructor', () => {
    it('should create currency with valid amount and currency code', () => {
      const currency = new Currency(100, 'USD');
      expect(currency.getAmount()).toBe(100);
      expect(currency.getCurrencyCode()).toBe('USD');
    });

    it('should handle string amounts', () => {
      const currency = new Currency('100.50', 'USD');
      expect(currency.getAmount()).toBe(100.5);
    });

    it('should handle bigint amounts', () => {
      const currency = new Currency(BigInt(10000), 'USD');
      expect(currency.getCents()).toBe(10000n);
    });

    it('should handle different currency codes', () => {
      const codes = ['USD', 'EUR', 'GBP', 'JPY', 'CHF'];
      codes.forEach((code) => {
        const currency = new Currency(100, code);
        expect(currency.getCurrencyCode()).toBe(code);
      });
    });

    it('should handle currencies with different decimal places', () => {
      const usd = new Currency(100.5, 'USD');
      expect(usd.getAmount()).toBe(100.5);
      expect(usd.getCents()).toBe(10050n);

      const jpy = new Currency(100, 'JPY');
      expect(jpy.getAmount()).toBe(100);
      expect(jpy.getCents()).toBe(100n); // No decimals for JPY
    });

    it('should reject negative amounts', () => {
      expect(() => new Currency(-100, 'USD')).toThrow('Currency amount cannot be negative');
      expect(() => new Currency('-50', 'EUR')).toThrow('Currency amount cannot be negative');
    });

    it('should handle unknown currency codes with defaults', () => {
      const currency = new Currency(100, 'XXX');
      expect(currency.getCurrencyCode()).toBe('XXX');
      expect(currency.getCurrencyInfo().decimals).toBe(2);
    });

    it('should reject invalid currency codes', () => {
      expect(() => new Currency(100, 'US')).toThrow('Invalid currency code');
      expect(() => new Currency(100, 'USDD')).toThrow('Invalid currency code');
      expect(() => new Currency(100, '123')).toThrow('Invalid currency code');
    });
  });

  describe('factory methods', () => {
    it('should create currency using create method', () => {
      const currency = Currency.create(50.25, 'EUR');
      expect(currency.getAmount()).toBe(50.25);
      expect(currency.getCurrencyCode()).toBe('EUR');
    });

    it('should create zero currency', () => {
      const zero = Currency.zero('USD');
      expect(zero.getAmount()).toBe(0);
      expect(zero.isZero()).toBe(true);
    });

    it('should create from cents', () => {
      const currency = Currency.fromCents(5025, 'USD');
      expect(currency.getAmount()).toBe(50.25);
      expect(currency.getCents()).toBe(5025n);
    });
  });

  describe('arithmetic operations', () => {
    describe('addition', () => {
      it('should add two currency values', () => {
        const currency1 = new Currency(100.5, 'USD');
        const currency2 = new Currency(50.25, 'USD');
        const result = currency1.add(currency2);

        expect(result.getAmount()).toBe(150.75);
        expect(result.getCurrencyCode()).toBe('USD');
      });

      it('should throw when adding different currencies', () => {
        const usd = new Currency(100, 'USD');
        const eur = new Currency(100, 'EUR');

        expect(() => usd.add(eur)).toThrow('different currencies');
      });
    });

    describe('subtraction', () => {
      it('should subtract two currency values', () => {
        const currency1 = new Currency(100.5, 'USD');
        const currency2 = new Currency(50.25, 'USD');
        const result = currency1.subtract(currency2);

        expect(result.getAmount()).toBe(50.25);
      });

      it('should throw when result would be negative', () => {
        const currency1 = new Currency(50, 'USD');
        const currency2 = new Currency(100, 'USD');

        expect(() => currency1.subtract(currency2)).toThrow('negative amount');
      });
    });

    describe('multiplication', () => {
      it('should multiply currency by factor', () => {
        const currency = new Currency(100, 'USD');
        const result = currency.multiply(1.5);

        expect(result.getAmount()).toBe(150);
      });

      it('should handle decimal multiplication', () => {
        const currency = new Currency(33.33, 'USD');
        const result = currency.multiply(3);

        expect(result.getAmount()).toBe(99.99);
      });

      it('should throw for negative factor', () => {
        const currency = new Currency(100, 'USD');
        expect(() => currency.multiply(-2)).toThrow('negative factor');
      });
    });

    describe('division', () => {
      it('should divide currency by divisor', () => {
        const currency = new Currency(100, 'USD');
        const result = currency.divide(4);

        expect(result.getAmount()).toBe(25);
      });

      it('should handle division with rounding', () => {
        const currency = new Currency(100, 'USD');
        const result = currency.divide(3);

        expect(result.getAmount()).toBe(33.33);
      });

      it('should throw for zero divisor', () => {
        const currency = new Currency(100, 'USD');
        expect(() => currency.divide(0)).toThrow('divide by zero');
      });

      it('should throw for negative divisor', () => {
        const currency = new Currency(100, 'USD');
        expect(() => currency.divide(-2)).toThrow('negative divisor');
      });
    });

    describe('percentage', () => {
      it('should calculate percentage', () => {
        const currency = new Currency(100, 'USD');
        const result = currency.percentage(15);

        expect(result.getAmount()).toBe(15);
      });

      it('should handle decimal percentages', () => {
        const currency = new Currency(100, 'USD');
        const result = currency.percentage(7.5);

        expect(result.getAmount()).toBe(7.5);
      });
    });
  });

  describe('comparison operations', () => {
    const currency1 = new Currency(100, 'USD');
    const currency2 = new Currency(100, 'USD');
    const currency3 = new Currency(200, 'USD');

    it('should check equality', () => {
      expect(currency1.equals(currency2)).toBe(true);
      expect(currency1.equals(currency3)).toBe(false);
    });

    it('should compare less than', () => {
      expect(currency1.lessThan(currency3)).toBe(true);
      expect(currency3.lessThan(currency1)).toBe(false);
      expect(currency1.lessThan(currency2)).toBe(false);
    });

    it('should compare less than or equal', () => {
      expect(currency1.lessThanOrEqual(currency3)).toBe(true);
      expect(currency1.lessThanOrEqual(currency2)).toBe(true);
      expect(currency3.lessThanOrEqual(currency1)).toBe(false);
    });

    it('should compare greater than', () => {
      expect(currency3.greaterThan(currency1)).toBe(true);
      expect(currency1.greaterThan(currency3)).toBe(false);
      expect(currency1.greaterThan(currency2)).toBe(false);
    });

    it('should compare greater than or equal', () => {
      expect(currency3.greaterThanOrEqual(currency1)).toBe(true);
      expect(currency1.greaterThanOrEqual(currency2)).toBe(true);
      expect(currency1.greaterThanOrEqual(currency3)).toBe(false);
    });

    it('should check if zero', () => {
      const zero = Currency.zero('USD');
      const nonZero = new Currency(0.01, 'USD');

      expect(zero.isZero()).toBe(true);
      expect(nonZero.isZero()).toBe(false);
    });

    it('should check if positive', () => {
      const positive = new Currency(100, 'USD');
      const zero = Currency.zero('USD');

      expect(positive.isPositive()).toBe(true);
      expect(zero.isPositive()).toBe(false);
    });
  });

  describe('formatting', () => {
    it('should format with default options', () => {
      const currency = new Currency(1234.56, 'USD');
      expect(currency.format()).toBe('$1,234.56');
    });

    it('should format without symbol', () => {
      const currency = new Currency(1234.56, 'USD');
      expect(currency.format({ symbol: false })).toBe('1,234.56 USD');
    });

    it('should format without thousands separator', () => {
      const currency = new Currency(1234.56, 'USD');
      expect(currency.format({ thousandsSeparator: false })).toBe('$1234.56');
    });

    it('should format with custom decimal separator', () => {
      const currency = new Currency(1234.56, 'EUR');
      expect(currency.format({ decimalSeparator: ',' })).toBe('€1,234,56');
    });

    it('should format with symbol after', () => {
      const currency = new Currency(1234.56, 'EUR');
      expect(currency.format({ symbolPosition: 'after' })).toBe('1,234.56 €');
    });

    it('should format currencies with no decimals', () => {
      const currency = new Currency(1234, 'JPY');
      expect(currency.format()).toBe('¥1,234');
    });

    it('should format using locale', () => {
      const currency = new Currency(1234.56, 'USD');

      // US format
      expect(currency.toLocaleString('en-US')).toMatch(/\$1,234\.56/);

      // European format
      expect(currency.toLocaleString('de-DE')).toMatch(/1\.234,56/);
    });
  });

  describe('rounding', () => {
    it('should round to nearest dollar', () => {
      const currency = new Currency(10.49, 'USD');
      const rounded = currency.round(0);
      expect(rounded.getAmount()).toBe(10);
    });

    it('should round up', () => {
      const currency = new Currency(10.5, 'USD');
      const rounded = currency.round(0);
      expect(rounded.getAmount()).toBe(11);
    });

    it('should round to specific precision', () => {
      const currency = new Currency(10.456, 'USD');
      const rounded = currency.round(2);
      expect(rounded.getAmount()).toBe(10.46);
    });
  });

  describe('allocation', () => {
    it('should allocate proportionally', () => {
      const currency = new Currency(100, 'USD');
      const allocated = currency.allocate([1, 1, 1]);

      expect(allocated).toHaveLength(3);
      expect(allocated[0].getAmount()).toBeCloseTo(33.33, 2);
      expect(allocated[1].getAmount()).toBeCloseTo(33.33, 2);
      expect(allocated[2].getAmount()).toBe(33.34); // Gets remainder

      // Total should equal original
      const total = allocated.reduce((sum, m) => sum.add(m));
      expect(total.equals(currency)).toBe(true);
    });

    it('should handle uneven allocations', () => {
      const currency = new Currency(100, 'USD');
      const allocated = currency.allocate([70, 20, 10]);

      expect(allocated[0].getAmount()).toBe(70);
      expect(allocated[1].getAmount()).toBe(20);
      expect(allocated[2].getAmount()).toBe(10);
    });

    it('should throw for zero ratios', () => {
      const currency = new Currency(100, 'USD');
      expect(() => currency.allocate([0, 0, 0])).toThrow('greater than zero');
    });
  });

  describe('serialization', () => {
    const currency = new Currency(123.45, 'EUR');

    it('should convert to string', () => {
      expect(currency.toString()).toBe('€123.45');
    });

    it('should serialize to JSON', () => {
      expect(currency.toJSON()).toEqual({
        amount: '123.45',
        currency: 'EUR',
      });
    });

    it('should deserialize from JSON', () => {
      const json = { amount: '123.45', currency: 'EUR' };
      const deserialized = Currency.fromJSON(json);

      expect(deserialized.getAmount()).toBe(123.45);
      expect(deserialized.getCurrencyCode()).toBe('EUR');
    });
  });

  describe('validation', () => {
    it('should validate currency codes', () => {
      expect(Currency.isValidCurrencyCode('USD')).toBe(true);
      expect(Currency.isValidCurrencyCode('EUR')).toBe(true);
      expect(Currency.isValidCurrencyCode('XXX')).toBe(true); // Unknown but valid format
      expect(Currency.isValidCurrencyCode('US')).toBe(false);
      expect(Currency.isValidCurrencyCode('USDD')).toBe(false);
    });

    it('should validate amounts', () => {
      expect(Currency.isValidAmount(100)).toBe(true);
      expect(Currency.isValidAmount('100.50')).toBe(true);
      expect(Currency.isValidAmount(BigInt(100))).toBe(true);
      expect(Currency.isValidAmount(0)).toBe(true);

      expect(Currency.isValidAmount(-100)).toBe(false);
      expect(Currency.isValidAmount(NaN)).toBe(false);
      expect(Currency.isValidAmount(Infinity)).toBe(false);
      expect(Currency.isValidAmount('abc')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very large amounts', () => {
      const currency = new Currency('999999999999.99', 'USD');
      expect(currency.getAmount()).toBe(999999999999.99);
    });

    it('should handle very small amounts', () => {
      const currency = new Currency(0.01, 'USD');
      expect(currency.getAmount()).toBe(0.01);
      expect(currency.getCents()).toBe(1n);
    });

    it('should handle Bitcoin with 8 decimals', () => {
      const btc = new Currency(0.00000001, 'BTC');
      expect(btc.getAmount()).toBe(0.00000001);
      expect(btc.getCents()).toBe(1n);
    });

    it('should preserve precision in operations', () => {
      const currency1 = new Currency('0.1', 'USD');
      const currency2 = new Currency('0.2', 'USD');
      const result = currency1.add(currency2);

      expect(result.getAmount()).toBe(0.3);
      expect(result.getCents()).toBe(30n);
    });
  });
});
