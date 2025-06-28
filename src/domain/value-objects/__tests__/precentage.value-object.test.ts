// src/shared/value-objects/__tests__/percentage.value-object.test.ts
import { Percentage } from '../percentage.value-object';

describe('Percentage Value Object', () => {
  describe('constructor', () => {
    it('should create from percentage number', () => {
      const pct = new Percentage(15);
      expect(pct.toPercentage()).toBe(15);
      expect(pct.toDecimal()).toBe(0.15);
    });

    it('should create from decimal number', () => {
      const pct = new Percentage(0.15, true);
      expect(pct.toPercentage()).toBe(15);
      expect(pct.toDecimal()).toBe(0.15);
    });

    it('should create from percentage string', () => {
      const pct1 = new Percentage('15%');
      expect(pct1.toPercentage()).toBe(15);
      
      const pct2 = new Percentage('15.5%');
      expect(pct2.toPercentage()).toBe(15.5);
    });

    it('should create from decimal string when specified', () => {
      const pct = new Percentage('0.15', true);
      expect(pct.toPercentage()).toBe(15);
    });

    it('should handle edge values', () => {
      expect(new Percentage(0).toDecimal()).toBe(0);
      expect(new Percentage(100).toDecimal()).toBe(1);
      expect(new Percentage('0%').toDecimal()).toBe(0);
      expect(new Percentage('100%').toDecimal()).toBe(1);
    });

    it('should reject invalid values', () => {
      expect(() => new Percentage(-1)).toThrow('between 0 and 100');
      expect(() => new Percentage(101)).toThrow('between 0 and 100');
      expect(() => new Percentage(1.1, true)).toThrow('between 0 and 100');
      expect(() => new Percentage('invalid')).toThrow('Invalid percentage');
      expect(() => new Percentage(NaN)).toThrow('Invalid percentage');
      expect(() => new Percentage(Infinity)).toThrow('Invalid percentage');
    });
  });

  describe('factory methods', () => {
    it('should create from decimal', () => {
      const pct = Percentage.fromDecimal(0.25);
      expect(pct.toPercentage()).toBe(25);
    });

    it('should create from percentage', () => {
      const pct = Percentage.fromPercentage(25);
      expect(pct.toDecimal()).toBe(0.25);
    });

    it('should create from string', () => {
      const pct = Percentage.fromString('25%');
      expect(pct.toPercentage()).toBe(25);
    });

    it('should create common percentages', () => {
      expect(Percentage.zero().toPercentage()).toBe(0);
      expect(Percentage.fifty().toPercentage()).toBe(50);
      expect(Percentage.hundred().toPercentage()).toBe(100);
    });

    it('should tryCreate return null for invalid', () => {
      expect(Percentage.tryCreate('invalid')).toBeNull();
      expect(Percentage.tryCreate(null)).toBeNull();
      expect(Percentage.tryCreate(undefined)).toBeNull();
      expect(Percentage.tryCreate({})).toBeNull();
    });
  });

  describe('conversions', () => {
    const pct = new Percentage(15.5);

    it('should convert to decimal', () => {
      expect(pct.toDecimal()).toBe(0.155);
    });

    it('should convert to percentage', () => {
      expect(pct.toPercentage()).toBe(15.5);
    });

    it('should convert to whole percentage', () => {
      expect(pct.toWholePercentage()).toBe(16);
      expect(new Percentage(15.4).toWholePercentage()).toBe(15);
    });

    it('should convert to basis points', () => {
      expect(pct.toBasisPoints()).toBe(1550);
      expect(new Percentage(1).toBasisPoints()).toBe(100);
      expect(new Percentage(0.01).toBasisPoints()).toBe(1);
    });
  });

  describe('arithmetic operations', () => {
    describe('addition', () => {
      it('should add percentages', () => {
        const pct1 = new Percentage(25);
        const pct2 = new Percentage(15);
        const result = pct1.add(pct2);
        expect(result.toPercentage()).toBe(40);
      });

      it('should handle decimal precision', () => {
        const pct1 = new Percentage(33.33);
        const pct2 = new Percentage(66.67);
        const result = pct1.add(pct2);
        expect(result.toPercentage()).toBeCloseTo(100, 2);
      });
    });

    describe('subtraction', () => {
      it('should subtract percentages', () => {
        const pct1 = new Percentage(75);
        const pct2 = new Percentage(25);
        const result = pct1.subtract(pct2);
        expect(result.toPercentage()).toBe(50);
      });

      it('should throw on negative result', () => {
        const pct1 = new Percentage(25);
        const pct2 = new Percentage(50);
        expect(() => pct1.subtract(pct2)).toThrow('negative percentage');
      });
    });

    describe('multiplication', () => {
      it('should multiply by factor', () => {
        const pct = new Percentage(50);
        const result = pct.multiply(0.5);
        expect(result.toPercentage()).toBe(25);
      });

      it('should throw on negative factor', () => {
        const pct = new Percentage(50);
        expect(() => pct.multiply(-2)).toThrow('negative factor');
      });

      it('should throw if result exceeds 100%', () => {
        const pct = new Percentage(60);
        expect(() => pct.multiply(2)).toThrow('exceeds 100%');
      });
    });

    describe('division', () => {
      it('should divide by divisor', () => {
        const pct = new Percentage(50);
        const result = pct.divide(2);
        expect(result.toPercentage()).toBe(25);
      });

      it('should throw on zero divisor', () => {
        const pct = new Percentage(50);
        expect(() => pct.divide(0)).toThrow('divide by zero');
      });

      it('should throw on negative divisor', () => {
        const pct = new Percentage(50);
        expect(() => pct.divide(-2)).toThrow('negative divisor');
      });
    });
  });

  describe('percentage calculations', () => {
    it('should calculate percentage of value', () => {
      const pct = new Percentage(15);
      expect(pct.of(200)).toBe(30);
      expect(pct.of(1000)).toBe(150);
    });

    it('should calculate what percentage of', () => {
      const pct = Percentage.whatPercentOf(15, 100);
      expect(pct.toPercentage()).toBe(15);
      
      const pct2 = Percentage.whatPercentOf(50, 200);
      expect(pct2.toPercentage()).toBe(25);
    });

    it('should throw when calculating percentage of zero', () => {
      expect(() => Percentage.whatPercentOf(10, 0)).toThrow('percentage of zero');
    });

    it('should invert percentage', () => {
      const pct = new Percentage(25);
      const inverted = pct.invert();
      expect(inverted.toPercentage()).toBe(75);
      
      expect(new Percentage(0).invert().toPercentage()).toBe(100);
      expect(new Percentage(100).invert().toPercentage()).toBe(0);
    });
  });

  describe('comparison operations', () => {
    const pct25 = new Percentage(25);
    const pct50 = new Percentage(50);
    const pct25b = new Percentage(25);

    it('should check equality', () => {
      expect(pct25.equals(pct25b)).toBe(true);
      expect(pct25.equals(pct50)).toBe(false);
      expect(pct25.equals(25)).toBe(true);
      expect(pct25.equals(50)).toBe(false);
    });

    it('should compare less than', () => {
      expect(pct25.lessThan(pct50)).toBe(true);
      expect(pct50.lessThan(pct25)).toBe(false);
      expect(pct25.lessThan(pct25b)).toBe(false);
      expect(pct25.lessThan(50)).toBe(true);
    });

    it('should compare less than or equal', () => {
      expect(pct25.lessThanOrEqual(pct50)).toBe(true);
      expect(pct25.lessThanOrEqual(pct25b)).toBe(true);
      expect(pct50.lessThanOrEqual(pct25)).toBe(false);
    });

    it('should compare greater than', () => {
      expect(pct50.greaterThan(pct25)).toBe(true);
      expect(pct25.greaterThan(pct50)).toBe(false);
      expect(pct25.greaterThan(pct25b)).toBe(false);
      expect(pct50.greaterThan(25)).toBe(true);
    });

    it('should compare greater than or equal', () => {
      expect(pct50.greaterThanOrEqual(pct25)).toBe(true);
      expect(pct25.greaterThanOrEqual(pct25b)).toBe(true);
      expect(pct25.greaterThanOrEqual(pct50)).toBe(false);
    });
  });

  describe('range checks', () => {
    it('should check if zero', () => {
      expect(new Percentage(0).isZero()).toBe(true);
      expect(new Percentage(0.1).isZero()).toBe(false);
    });

    it('should check if hundred', () => {
      expect(new Percentage(100).isHundred()).toBe(true);
      expect(new Percentage(99.9).isHundred()).toBe(false);
    });

    it('should check if between', () => {
      const pct = new Percentage(50);
      expect(pct.isBetween(new Percentage(25), new Percentage(75))).toBe(true);
      expect(pct.isBetween(25, 75)).toBe(true);
      expect(pct.isBetween(60, 80)).toBe(false);
    });
  });

  describe('formatting', () => {
    it('should format with default options', () => {
      expect(new Percentage(15.5).format()).toBe('15.50%');
      expect(new Percentage(100).format()).toBe('100.00%');
      expect(new Percentage(0).format()).toBe('0.00%');
    });

    it('should format with custom decimals', () => {
      const pct = new Percentage(15.567);
      expect(pct.format({ decimals: 0 })).toBe('16%');
      expect(pct.format({ decimals: 1 })).toBe('15.6%');
      expect(pct.format({ decimals: 3 })).toBe('15.567%');
    });

    it('should format without sign', () => {
      expect(new Percentage(15).format({ includeSign: false })).toBe('15.00');
    });

    it('should format with locale', () => {
      const pct = new Percentage(12.34); // Changed from 1234.56 to valid percentage
      // Note: Node.js might not have all locales, so we test what we can
      expect(pct.format({ locale: 'en-US' })).toBe('12.34%');
    });

    it('should format as change', () => {
      expect(new Percentage(15).formatChange()).toBe('+15.00%');
      expect(new Percentage(0).formatChange()).toBe('0.00%');
      expect(new Percentage(15).formatChange({ showPlus: false })).toBe('15.00%');
    });
  });

  describe('rounding', () => {
    it('should round to specified decimals', () => {
      const pct = new Percentage(15.567);
      expect(pct.round(0).toPercentage()).toBe(16);
      expect(pct.round(1).toPercentage()).toBe(15.6);
      expect(pct.round(2).toPercentage()).toBe(15.57);
    });
  });

  describe('clamping', () => {
    it('should clamp to range', () => {
      // Test normal clamping
      const pct = new Percentage(50);
      const clamped = pct.clamp(0, 100);
      expect(clamped.toPercentage()).toBe(50);
      
      // Test clamping to minimum
      const clampedMin = new Percentage(5).clamp(10, 100);
      expect(clampedMin.toPercentage()).toBe(10);
      
      // Test clamping to maximum
      const clampedMax = new Percentage(95).clamp(0, 90);
      expect(clampedMax.toPercentage()).toBe(90);
    });
  });

  describe('constants', () => {
    it('should provide common percentages', () => {
      expect(Percentage.ZERO.toPercentage()).toBe(0);
      expect(Percentage.FIVE.toPercentage()).toBe(5);
      expect(Percentage.TEN.toPercentage()).toBe(10);
      expect(Percentage.QUARTER.toPercentage()).toBe(25);
      expect(Percentage.THIRD.toPercentage()).toBeCloseTo(33.33, 2);
      expect(Percentage.HALF.toPercentage()).toBe(50);
      expect(Percentage.TWO_THIRDS.toPercentage()).toBeCloseTo(66.67, 2);
      expect(Percentage.THREE_QUARTERS.toPercentage()).toBe(75);
      expect(Percentage.HUNDRED.toPercentage()).toBe(100);
    });
  });

  describe('serialization', () => {
    const pct = new Percentage(15.5);

    it('should convert to string', () => {
      expect(pct.toString()).toBe('15.50%');
      expect(String(pct)).toBe('15.50%');
    });

    it('should serialize to JSON', () => {
      expect(pct.toJSON()).toEqual({
        value: 15.5,
        format: 'percentage',
      });
    });

    it('should deserialize from JSON', () => {
      const json = { value: 15.5, format: 'percentage' };
      const deserialized = Percentage.fromJSON(json);
      expect(deserialized.toPercentage()).toBe(15.5);
      
      const decimalJson = { value: 0.155, format: 'decimal' };
      const decimalDeserialized = Percentage.fromJSON(decimalJson);
      expect(decimalDeserialized.toPercentage()).toBe(15.5);
    });
  });

  describe('validation', () => {
    it('should validate percentage values', () => {
      expect(Percentage.isValid(50)).toBe(true);
      expect(Percentage.isValid(0)).toBe(true);
      expect(Percentage.isValid(100)).toBe(true);
      expect(Percentage.isValid('50%')).toBe(true);
      expect(Percentage.isValid('50')).toBe(true);
      
      expect(Percentage.isValid(-1)).toBe(false);
      expect(Percentage.isValid(101)).toBe(false);
      expect(Percentage.isValid('invalid')).toBe(false);
      expect(Percentage.isValid(NaN)).toBe(false);
      expect(Percentage.isValid(null)).toBe(false);
    });

    it('should validate decimal values', () => {
      expect(Percentage.isValid(0.5, true)).toBe(true);
      expect(Percentage.isValid(0, true)).toBe(true);
      expect(Percentage.isValid(1, true)).toBe(true);
      
      expect(Percentage.isValid(1.1, true)).toBe(false);
      expect(Percentage.isValid(-0.1, true)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very small percentages', () => {
      const pct = new Percentage(0.01);
      expect(pct.toDecimal()).toBe(0.0001);
      expect(pct.toBasisPoints()).toBe(1);
    });

    it('should handle floating point precision', () => {
      const pct1 = new Percentage(33.33);
      const pct2 = new Percentage(33.34);
      const pct3 = new Percentage(33.33);
      
      const sum = pct1.add(pct2).add(pct3);
      expect(sum.toPercentage()).toBeCloseTo(100, 2);
    });

    it('should handle string edge cases', () => {
      expect(new Percentage(' 50% ').toPercentage()).toBe(50);
      expect(new Percentage('50.00%').toPercentage()).toBe(50);
      expect(new Percentage('.5', true).toPercentage()).toBe(50);
    });
  });
});