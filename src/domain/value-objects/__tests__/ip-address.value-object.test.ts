// src/shared/value-objects/__tests__/ip-address.value-object.test.ts
import { IPAddress } from '../ip-address.value-object';

describe('IPAddress Value Object', () => {
  describe('constructor', () => {
    it('should create valid IPv4 addresses', () => {
      const ips = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
        '8.8.8.8',
        '255.255.255.255',
        '0.0.0.0',
      ];

      ips.forEach((ip) => {
        const ipAddr = new IPAddress(ip);
        expect(ipAddr.getValue()).toBe(ip);
        expect(ipAddr.isIPv4()).toBe(true);
        expect(ipAddr.isIPv6()).toBe(false);
      });
    });

    it('should create valid IPv6 addresses', () => {
      const ips = [
        '2001:db8::1',
        '::1',
        'fe80::1',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '::',
        '2001:db8::8a2e:370:7334',
      ];

      ips.forEach((ip) => {
        const ipAddr = new IPAddress(ip);
        expect(ipAddr.getValue()).toBe(ip);
        expect(ipAddr.isIPv6()).toBe(true);
        expect(ipAddr.isIPv4()).toBe(false);
      });
    });

    it('should reject invalid IP addresses', () => {
      const invalid = [
        '256.256.256.256',
        '192.168.1',
        '192.168.1.1.1',
        'not.an.ip.address',
        '192.168.-1.1',
        '192.168.1.256',
        '',
        'hello world',
        '2001:db8::1::2', // double ::
        'gggg::1', // invalid hex
      ];

      invalid.forEach((ip) => {
        expect(() => new IPAddress(ip)).toThrow('Invalid IP address');
      });
    });

    it('should handle IPv4 with leading zeros', () => {
      const ip = new IPAddress('192.168.001.001');
      expect(ip.getNormalized()).toBe('192.168.1.1');
    });
  });

  describe('factory methods', () => {
    it('should create from octets', () => {
      const ip = IPAddress.fromOctets([192, 168, 1, 1]);
      expect(ip.getValue()).toBe('192.168.1.1');
    });

    it('should reject invalid octets', () => {
      expect(() => IPAddress.fromOctets([256, 0, 0, 0])).toThrow('between 0 and 255');
      expect(() => IPAddress.fromOctets([192, 168, 1])).toThrow('4 octets');
      expect(() => IPAddress.fromOctets([-1, 0, 0, 0])).toThrow('between 0 and 255');
    });

    it('should create from decimal', () => {
      const ip = IPAddress.fromDecimal(3232235777); // 192.168.1.1
      expect(ip.getValue()).toBe('192.168.1.1');

      const ip2 = IPAddress.fromDecimal(134744072); // 8.8.8.8
      expect(ip2.getValue()).toBe('8.8.8.8');
    });

    it('should reject invalid decimal', () => {
      expect(() => IPAddress.fromDecimal(-1)).toThrow('out of IPv4 range');
      expect(() => IPAddress.fromDecimal(4294967296)).toThrow('out of IPv4 range');
    });

    it('should tryCreate return null for invalid', () => {
      expect(IPAddress.tryCreate('invalid')).toBeNull();
      expect(IPAddress.tryCreate(123)).toBeNull();
      expect(IPAddress.tryCreate(null)).toBeNull();
    });
  });

  describe('IPv4 operations', () => {
    const ip = new IPAddress('192.168.1.100');

    it('should get octets', () => {
      expect(ip.getOctets()).toEqual([192, 168, 1, 100]);
    });

    it('should convert to decimal', () => {
      expect(ip.toDecimal()).toBe(3232235876);

      expect(new IPAddress('0.0.0.0').toDecimal()).toBe(0);
      expect(new IPAddress('255.255.255.255').toDecimal()).toBe(4294967295);
    });

    it('should convert to binary', () => {
      expect(new IPAddress('192.168.1.1').toBinary()).toBe('11000000.10101000.00000001.00000001');
      expect(new IPAddress('255.255.255.255').toBinary()).toBe(
        '11111111.11111111.11111111.11111111',
      );
      expect(new IPAddress('0.0.0.0').toBinary()).toBe('00000000.00000000.00000000.00000000');
    });

    it('should return null for IPv6 operations', () => {
      const ipv6 = new IPAddress('::1');
      expect(ipv6.getOctets()).toBeNull();
      expect(ipv6.toDecimal()).toBeNull();
      expect(ipv6.toBinary()).toBeNull();
    });
  });

  describe('IPv6 operations', () => {
    it('should get segments', () => {
      const ip = new IPAddress('2001:db8::1');
      const segments = ip.getSegments();
      expect(segments).toHaveLength(8);
      expect(segments?.[0]).toBe('2001');
      expect(segments?.[1]).toBe('0db8');
    });

    it('should normalize IPv6 addresses', () => {
      const ip1 = new IPAddress('2001:db8::1');
      expect(ip1.getNormalized()).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');

      const ip2 = new IPAddress('::1');
      expect(ip2.getNormalized()).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
    });

    it('should return null for IPv4 operations', () => {
      const ip = new IPAddress('192.168.1.1');
      expect(ip.getSegments()).toBeNull();
    });
  });

  describe('IP classification', () => {
    describe('private IPs', () => {
      it('should identify private IPv4 addresses', () => {
        expect(new IPAddress('10.0.0.1').isPrivate()).toBe(true);
        expect(new IPAddress('10.255.255.255').isPrivate()).toBe(true);
        expect(new IPAddress('172.16.0.1').isPrivate()).toBe(true);
        expect(new IPAddress('172.31.255.255').isPrivate()).toBe(true);
        expect(new IPAddress('192.168.0.1').isPrivate()).toBe(true);
        expect(new IPAddress('192.168.255.255').isPrivate()).toBe(true);

        expect(new IPAddress('8.8.8.8').isPrivate()).toBe(false);
        expect(new IPAddress('172.32.0.1').isPrivate()).toBe(false);
      });

      it('should identify private IPv6 addresses', () => {
        expect(new IPAddress('fc00::1').isPrivate()).toBe(true);
        expect(new IPAddress('fd00::1').isPrivate()).toBe(true);
        expect(new IPAddress('fe80::1').isPrivate()).toBe(true);

        expect(new IPAddress('2001:db8::1').isPrivate()).toBe(false);
      });
    });

    describe('loopback IPs', () => {
      it('should identify loopback addresses', () => {
        expect(new IPAddress('127.0.0.1').isLoopback()).toBe(true);
        expect(new IPAddress('127.0.0.255').isLoopback()).toBe(true);
        expect(new IPAddress('::1').isLoopback()).toBe(true);

        expect(new IPAddress('192.168.1.1').isLoopback()).toBe(false);
        expect(new IPAddress('::2').isLoopback()).toBe(false);
      });
    });

    describe('link-local IPs', () => {
      it('should identify link-local addresses', () => {
        expect(new IPAddress('169.254.0.1').isLinkLocal()).toBe(true);
        expect(new IPAddress('169.254.255.255').isLinkLocal()).toBe(true);
        expect(new IPAddress('fe80::1').isLinkLocal()).toBe(true);

        expect(new IPAddress('169.253.0.1').isLinkLocal()).toBe(false);
        expect(new IPAddress('2001:db8::1').isLinkLocal()).toBe(false);
      });
    });

    describe('multicast IPs', () => {
      it('should identify multicast addresses', () => {
        expect(new IPAddress('224.0.0.1').isMulticast()).toBe(true);
        expect(new IPAddress('239.255.255.255').isMulticast()).toBe(true);
        expect(new IPAddress('ff02::1').isMulticast()).toBe(true);

        expect(new IPAddress('223.255.255.255').isMulticast()).toBe(false);
        expect(new IPAddress('240.0.0.1').isMulticast()).toBe(false);
      });
    });

    it('should identify broadcast address', () => {
      expect(new IPAddress('255.255.255.255').isBroadcast()).toBe(true);
      expect(new IPAddress('192.168.1.255').isBroadcast()).toBe(false);
      expect(new IPAddress('::1').isBroadcast()).toBe(false); // IPv6 has no broadcast
    });
  });

  describe('CIDR range checking', () => {
    it('should check if IPv4 is in CIDR range', () => {
      const ip = new IPAddress('192.168.1.100');

      expect(ip.isInRange('192.168.1.0/24')).toBe(true);
      expect(ip.isInRange('192.168.0.0/16')).toBe(true);
      expect(ip.isInRange('192.0.0.0/8')).toBe(true);
      expect(ip.isInRange('192.168.1.100/32')).toBe(true);

      expect(ip.isInRange('192.168.2.0/24')).toBe(false);
      expect(ip.isInRange('10.0.0.0/8')).toBe(false);
    });

    it('should check if IPv6 is in CIDR range', () => {
      const ip = new IPAddress('2001:db8::1');

      expect(ip.isInRange('2001:db8::/32')).toBe(true);
      expect(ip.isInRange('2001:db8::1/128')).toBe(true);

      expect(ip.isInRange('2001:db9::/32')).toBe(false);
    });
  });

  describe('IP arithmetic', () => {
    it('should get next IPv4 address', () => {
      expect(new IPAddress('192.168.1.1').next()?.getValue()).toBe('192.168.1.2');
      expect(new IPAddress('192.168.1.255').next()?.getValue()).toBe('192.168.2.0');
      expect(new IPAddress('255.255.255.255').next()).toBeNull();
    });

    it('should get previous IPv4 address', () => {
      expect(new IPAddress('192.168.1.1').previous()?.getValue()).toBe('192.168.1.0');
      expect(new IPAddress('192.168.2.0').previous()?.getValue()).toBe('192.168.1.255');
      expect(new IPAddress('0.0.0.0').previous()).toBeNull();
    });

    it('should return null for IPv6 arithmetic', () => {
      const ipv6 = new IPAddress('::1');
      expect(ipv6.next()).toBeNull();
      expect(ipv6.previous()).toBeNull();
    });
  });

  describe('comparison', () => {
    it('should check equality', () => {
      const ip1 = new IPAddress('192.168.1.1');
      const ip2 = new IPAddress('192.168.001.001');
      const ip3 = new IPAddress('192.168.1.2');

      expect(ip1.equals(ip2)).toBe(true);
      expect(ip1.equals('192.168.1.1')).toBe(true);
      expect(ip1.equals(ip3)).toBe(false);
    });

    it('should compare IPv4 addresses', () => {
      const ip1 = new IPAddress('192.168.1.1');
      const ip2 = new IPAddress('192.168.1.2');
      const ip3 = new IPAddress('192.168.1.1');

      expect(ip1.lessThan(ip2)).toBe(true);
      expect(ip2.greaterThan(ip1)).toBe(true);
      expect(ip1.lessThan(ip3)).toBe(false);
      expect(ip1.greaterThan(ip3)).toBe(false);
    });

    it('should compare different versions', () => {
      const ipv4 = new IPAddress('192.168.1.1');
      const ipv6 = new IPAddress('::1');

      expect(ipv4.compareTo(ipv6)).toBeLessThan(0);
      expect(ipv6.compareTo(ipv4)).toBeGreaterThan(0);
    });
  });

  describe('getInfo', () => {
    it('should return complete IPv4 info', () => {
      const info = new IPAddress('192.168.1.1').getInfo();

      expect(info.version).toBe('IPv4');
      expect(info.octets).toEqual([192, 168, 1, 1]);
      expect(info.decimal).toBe(3232235777);
      expect(info.isPrivate).toBe(true);
      expect(info.isLoopback).toBe(false);
      expect(info.isLinkLocal).toBe(false);
      expect(info.isMulticast).toBe(false);
    });

    it('should return complete IPv6 info', () => {
      const info = new IPAddress('fe80::1').getInfo();

      expect(info.version).toBe('IPv6');
      expect(info.segments).toHaveLength(8);
      expect(info.isPrivate).toBe(true);
      expect(info.isLoopback).toBe(false);
      expect(info.isLinkLocal).toBe(true);
      expect(info.isMulticast).toBe(false);
    });
  });

  describe('serialization', () => {
    const ip = new IPAddress('192.168.1.1');

    it('should convert to string', () => {
      expect(ip.toString()).toBe('192.168.1.1');
      expect(String(ip)).toBe('192.168.1.1');
    });

    it('should serialize to JSON', () => {
      expect(ip.toJSON()).toBe('192.168.1.1');
      expect(JSON.stringify({ ip })).toBe('{"ip":"192.168.1.1"}');
    });

    it('should deserialize from JSON', () => {
      const deserialized = IPAddress.fromJSON('192.168.1.1');
      expect(deserialized.getValue()).toBe('192.168.1.1');
    });
  });

  describe('validation', () => {
    it('should validate IP addresses', () => {
      expect(IPAddress.isValid('192.168.1.1')).toBe(true);
      expect(IPAddress.isValid('::1')).toBe(true);
      expect(IPAddress.isValid('not an ip')).toBe(false);
      expect(IPAddress.isValid(123)).toBe(false);
    });

    it('should validate IPv4 specifically', () => {
      expect(IPAddress.isValidIPv4('192.168.1.1')).toBe(true);
      expect(IPAddress.isValidIPv4('256.256.256.256')).toBe(false);
      expect(IPAddress.isValidIPv4('::1')).toBe(false);
    });

    it('should validate IPv6 specifically', () => {
      expect(IPAddress.isValidIPv6('::1')).toBe(true);
      expect(IPAddress.isValidIPv6('2001:db8::1')).toBe(true);
      expect(IPAddress.isValidIPv6('192.168.1.1')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle IPv6 variations', () => {
      const variations = [
        '2001:0db8:0000:0000:0000:0000:0000:0001',
        '2001:db8:0:0:0:0:0:1',
        '2001:db8::1',
      ];

      const normalized = '2001:0db8:0000:0000:0000:0000:0000:0001';

      variations.forEach((ip) => {
        expect(new IPAddress(ip).getNormalized()).toBe(normalized);
      });
    });

    it('should handle IPv4-mapped IPv6 addresses', () => {
      const ip = new IPAddress('::ffff:192.168.1.1');
      expect(ip.isIPv6()).toBe(true);
      expect(ip.getValue()).toBe('::ffff:192.168.1.1');
    });

    it('should handle edge case IPv4 values', () => {
      expect(new IPAddress('0.0.0.0').isPrivate()).toBe(false);
      expect(new IPAddress('0.0.0.0').isLoopback()).toBe(false);

      const broadcast = new IPAddress('255.255.255.255');
      expect(broadcast.isBroadcast()).toBe(true);
      expect(broadcast.isMulticast()).toBe(false);
    });
  });
});
