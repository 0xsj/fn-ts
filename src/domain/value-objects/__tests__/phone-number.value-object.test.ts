// src/shared/value-objects/__tests__/phone-number.value-object.test.ts
import { PhoneNumber } from '../phone-number.value-object';

describe('PhoneNumber Value Object', () => {
  describe('constructor', () => {
    it('should create valid phone number with country code', () => {
      const phone = new PhoneNumber('+1234567890');
      expect(phone.getValue()).toBe('+1234567890');
    });

    it('should add default country code to 10-digit numbers', () => {
      const phone = new PhoneNumber('2125551234', '1');
      expect(phone.getValue()).toBe('+12125551234');
    });

    it('should handle various US formats', () => {
      const formats = [
        { input: '(212) 555-1234', expected: '+12125551234' },
        { input: '212-555-1234', expected: '+12125551234' },
        { input: '2125551234', expected: '+12125551234' },
        { input: '+1 212 555 1234', expected: '+12125551234' },
        { input: '1-212-555-1234', expected: '+12125551234' },
      ];

      formats.forEach(({ input, expected }) => {
        const phone = new PhoneNumber(input, '1');
        expect(phone.getValue()).toBe(expected);
      });
    });

    it('should handle international formats', () => {
      const formats = [
        { input: '+44 20 7946 0958', expected: '+442079460958' },
        { input: '+33 1 42 86 82 00', expected: '+33142868200' },
        { input: '+49 30 12345678', expected: '+493012345678' },
        { input: '+81 3 1234 5678', expected: '+81312345678' },
      ];

      formats.forEach(({ input, expected }) => {
        const phone = new PhoneNumber(input);
        expect(phone.getValue()).toBe(expected);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalid = [
        '',
        '123', // Too short
        '+1234567890123456', // Too long (>15 digits)
        'abc-def-ghij', // Letters
        '+0123456789', // Invalid country code (starts with 0)
        '++12345678901', // Double plus
      ];

      invalid.forEach((value) => {
        expect(() => new PhoneNumber(value)).toThrow('Invalid phone number');
      });
    });

    it('should handle emergency numbers', () => {
      const phone911 = new PhoneNumber('911', '1');
      expect(phone911.getValue()).toBe('+1911');

      const phone112 = new PhoneNumber('112', '44');
      expect(phone112.getValue()).toBe('+44112');
    });
  });

  describe('factory methods', () => {
    it('should create from string', () => {
      const phone = PhoneNumber.create('+12125551234');
      expect(phone.getValue()).toBe('+12125551234');
    });

    it('should throw for non-string input', () => {
      expect(() => PhoneNumber.create(123)).toThrow('Phone number must be a string');
      expect(() => PhoneNumber.create(null)).toThrow('Phone number must be a string');
      expect(() => PhoneNumber.create(undefined)).toThrow('Phone number must be a string');
    });

    it('should tryCreate return null for invalid', () => {
      expect(PhoneNumber.tryCreate('invalid')).toBeNull();
      expect(PhoneNumber.tryCreate(123)).toBeNull();
      expect(PhoneNumber.tryCreate(null)).toBeNull();
    });

    it('should tryCreate return PhoneNumber for valid', () => {
      const phone = PhoneNumber.tryCreate('+12125551234');
      expect(phone).toBeInstanceOf(PhoneNumber);
      expect(phone?.getValue()).toBe('+12125551234');
    });
  });

  describe('components', () => {
    it('should parse US numbers correctly', () => {
      const phone = new PhoneNumber('+12125551234');
      const components = phone.getComponents();

      expect(components.countryCode).toBe('1');
      expect(components.nationalNumber).toBe('2125551234');
      expect(phone.getCountryCode()).toBe('1');
      expect(phone.getNationalNumber()).toBe('2125551234');
    });

    it('should parse international numbers', () => {
      const testCases = [
        { number: '+442079460958', country: '44', national: '2079460958' },
        { number: '+33142868200', country: '33', national: '142868200' },
        { number: '+4915112345678', country: '49', national: '15112345678' },
      ];

      testCases.forEach(({ number, country, national }) => {
        const phone = new PhoneNumber(number);
        expect(phone.getCountryCode()).toBe(country);
        expect(phone.getNationalNumber()).toBe(national);
      });
    });
  });

  describe('formatting', () => {
    describe('US numbers', () => {
      const phone = new PhoneNumber('+12125551234');

      it('should format as E.164', () => {
        expect(phone.format('e164')).toBe('+12125551234');
      });

      it('should format as international', () => {
        expect(phone.format('international')).toBe('+1 (212) 555-1234');
        expect(phone.format()).toBe('+1 (212) 555-1234'); // default
      });

      it('should format as national', () => {
        expect(phone.format('national')).toBe('(212) 555-1234');
      });

      it('should use toString for international format', () => {
        expect(phone.toString()).toBe('+1 (212) 555-1234');
      });
    });

    describe('international numbers', () => {
      it('should format UK numbers', () => {
        const phone = new PhoneNumber('+442079460958');
        expect(phone.format('international')).toBe('+44 2079460958');
        expect(phone.format('national')).toBe('2079460958');
      });

      it('should format other international numbers', () => {
        const phone = new PhoneNumber('+33142868200');
        expect(phone.format('international')).toBe('+33 142868200');
      });
    });
  });

  describe('masking', () => {
    it('should mask US numbers', () => {
      const phone = new PhoneNumber('+12125551234');
      expect(phone.getMasked()).toBe('+1 ******1234');
    });

    it('should mask international numbers', () => {
      const phone = new PhoneNumber('+442079460958');
      expect(phone.getMasked()).toBe('+44 ******0958');
    });

    it('should mask short numbers', () => {
      const phone = new PhoneNumber('+1911');
      expect(phone.getMasked()).toBe('+1 ***');
    });
  });

  describe('phone type detection', () => {
    it('should identify toll-free numbers', () => {
      const tollFreeNumbers = [
        '+18001234567',
        '+18881234567',
        '+18771234567',
        '+18661234567',
        '+18551234567',
        '+18441234567',
        '+18331234567',
      ];

      tollFreeNumbers.forEach((number) => {
        const phone = new PhoneNumber(number);
        expect(phone.isTollFree()).toBe(true);
        expect(phone.getType()).toBe('landline');
      });
    });

    it('should identify non-toll-free numbers', () => {
      const phone = new PhoneNumber('+12125551234');
      expect(phone.isTollFree()).toBe(false);
    });

    it('should return unknown type for most numbers', () => {
      const phone = new PhoneNumber('+12125551234');
      expect(phone.getType()).toBe('unknown');
    });
  });

  describe('emergency numbers', () => {
    it('should identify emergency numbers', () => {
      const emergencyNumbers = [
        { number: '911', countryCode: '1' },
        { number: '112', countryCode: '44' },
        { number: '999', countryCode: '44' },
        { number: '000', countryCode: '61' },
      ];

      emergencyNumbers.forEach(({ number, countryCode }) => {
        const phone = new PhoneNumber(number, countryCode);
        expect(phone.isEmergencyNumber()).toBe(true);
      });
    });

    it('should not identify regular numbers as emergency', () => {
      const phone = new PhoneNumber('+12125551234');
      expect(phone.isEmergencyNumber()).toBe(false);
    });

    it('should not allow SMS to emergency numbers', () => {
      const phone = new PhoneNumber('911', '1');
      expect(phone.isSmsCapable()).toBe(false);
    });
  });

  describe('SMS capability', () => {
    it('should allow SMS for regular numbers', () => {
      const phone = new PhoneNumber('+12125551234');
      expect(phone.isSmsCapable()).toBe(true);
    });

    it('should not allow SMS for emergency numbers', () => {
      const phone = new PhoneNumber('911', '1');
      expect(phone.isSmsCapable()).toBe(false);
    });
  });

  describe('country checks', () => {
    it('should get calling code', () => {
      const phone = new PhoneNumber('+12125551234');
      expect(phone.getCallingCode()).toBe('+1');

      const ukPhone = new PhoneNumber('+442079460958');
      expect(ukPhone.getCallingCode()).toBe('+44');
    });

    it('should check if from specific country', () => {
      const phone = new PhoneNumber('+12125551234');
      expect(phone.isFromCountry('1')).toBe(true);
      expect(phone.isFromCountry('+1')).toBe(true);
      expect(phone.isFromCountry('44')).toBe(false);
    });
  });

  describe('equality', () => {
    it('should compare phone numbers correctly', () => {
      const phone1 = new PhoneNumber('+12125551234');
      const phone2 = new PhoneNumber('(212) 555-1234', '1');
      const phone3 = new PhoneNumber('+12125559999');

      expect(phone1.equals(phone2)).toBe(true);
      expect(phone1.equals('+12125551234')).toBe(true);
      expect(phone1.equals(phone3)).toBe(false);
    });
  });

  describe('serialization', () => {
    const phone = new PhoneNumber('+12125551234');

    it('should serialize to JSON as E164', () => {
      expect(phone.toJSON()).toBe('+12125551234');
      expect(JSON.stringify({ phone })).toBe('{"phone":"+12125551234"}');
    });

    it('should deserialize from JSON', () => {
      const deserialized = PhoneNumber.fromJSON('+12125551234');
      expect(deserialized.getValue()).toBe('+12125551234');
    });
  });

  describe('validation', () => {
    it('should validate without creating instance', () => {
      expect(PhoneNumber.isValid('+12125551234')).toBe(true);
      expect(PhoneNumber.isValid('2125551234', '1')).toBe(true);
      expect(PhoneNumber.isValid('invalid')).toBe(false);
      expect(PhoneNumber.isValid(123)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle numbers with extensions', () => {
      const phone = new PhoneNumber('+12125551234x123');
      expect(phone.getValue()).toBe('+12125551234');
      expect(phone.getExtension()).toBe('123');
      expect(phone.getFullValue()).toBe('+12125551234x123');
      expect(phone.format('international')).toBe('+1 (212) 555-1234 x123');
    });

    it('should handle very long valid numbers', () => {
      // Maximum E.164 length is 15 digits (including country code)
      const maxLength = new PhoneNumber('+12345678901234'); // 14 digits total
      expect(maxLength.getValue()).toBe('+12345678901234');
    });

    it('should handle country codes of different lengths', () => {
      const testCases = [
        { input: '+1234567890', country: '1' }, // 1 digit
        { input: '+44234567890', country: '44' }, // 2 digits
        { input: '+972234567890', country: '9' }, // Should parse as 9, not 972
      ];

      testCases.forEach(({ input, country }) => {
        const phone = new PhoneNumber(input);
        expect(phone.getCountryCode()).toBe(country);
      });
    });
  });
});
