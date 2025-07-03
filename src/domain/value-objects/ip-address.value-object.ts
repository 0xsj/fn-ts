// src/shared/value-objects/ip-address.value-object.ts
import { z } from 'zod';

export type IPVersion = 'IPv4' | 'IPv6';

export interface IPAddressInfo {
  version: IPVersion;
  octets?: number[]; // IPv4 only
  segments?: string[]; // IPv6 only
  decimal?: number; // IPv4 decimal representation
  isPrivate: boolean;
  isLoopback: boolean;
  isLinkLocal: boolean;
  isMulticast: boolean;
}

/**
 * IP Address value object supporting both IPv4 and IPv6
 */
export class IPAddress {
  private static readonly IPv4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  private static readonly IPv6_REGEX =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  private readonly value: string;
  private readonly version: IPVersion;
  private readonly normalized: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (IPAddress.IPv4_REGEX.test(trimmed)) {
      this.version = 'IPv4';
      this.value = trimmed;
      this.normalized = this.normalizeIPv4(trimmed);
    } else if (IPAddress.IPv6_REGEX.test(trimmed)) {
      this.version = 'IPv6';
      this.value = trimmed;
      this.normalized = this.normalizeIPv6(trimmed);
    } else {
      throw new Error(`Invalid IP address: ${value}`);
    }
  }

  /**
   * Normalize IPv4 address (remove leading zeros)
   */
  private normalizeIPv4(ip: string): string {
    const octets = ip.split('.').map((octet) => parseInt(octet, 10));

    // Validate octets
    if (octets.some((octet) => octet > 255)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    return octets.join('.');
  }

  /**
   * Normalize IPv6 address (expand :: and lowercase)
   */
  private normalizeIPv6(ip: string): string {
    // Handle IPv4-mapped IPv6 addresses
    if (ip.includes('.')) {
      return ip.toLowerCase();
    }

    // Expand :: to full form
    let expanded = ip.toLowerCase();

    if (expanded.includes('::')) {
      const parts = expanded.split('::');
      const left = parts[0].split(':').filter((p) => p);
      const right = parts[1]?.split(':').filter((p) => p) || [];
      const missing = 8 - left.length - right.length;
      const zeros = new Array(missing).fill('0');

      expanded = [...left, ...zeros, ...right].join(':');
    }

    // Pad segments with leading zeros
    return expanded
      .split(':')
      .map((segment) => segment.padStart(4, '0'))
      .join(':');
  }

  /**
   * Factory methods
   */
  static create(value: unknown): IPAddress {
    if (typeof value !== 'string') {
      throw new Error('IP address must be a string');
    }
    return new IPAddress(value);
  }

  static tryCreate(value: unknown): IPAddress | null {
    try {
      return IPAddress.create(value);
    } catch {
      return null;
    }
  }

  static fromOctets(octets: number[]): IPAddress {
    if (octets.length !== 4) {
      throw new Error('IPv4 address must have 4 octets');
    }
    if (octets.some((octet) => octet < 0 || octet > 255)) {
      throw new Error('IPv4 octets must be between 0 and 255');
    }
    return new IPAddress(octets.join('.'));
  }

  static fromDecimal(decimal: number): IPAddress {
    if (decimal < 0 || decimal > 4294967295) {
      throw new Error('Decimal value out of IPv4 range');
    }

    const octets = [
      (decimal >>> 24) & 255,
      (decimal >>> 16) & 255,
      (decimal >>> 8) & 255,
      decimal & 255,
    ];

    return IPAddress.fromOctets(octets);
  }

  /**
   * Get the IP address value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Get normalized value
   */
  getNormalized(): string {
    return this.normalized;
  }

  /**
   * Get IP version
   */
  getVersion(): IPVersion {
    return this.version;
  }

  /**
   * Check if IPv4
   */
  isIPv4(): boolean {
    return this.version === 'IPv4';
  }

  /**
   * Check if IPv6
   */
  isIPv6(): boolean {
    return this.version === 'IPv6';
  }

  /**
   * Get IPv4 octets
   */
  getOctets(): number[] | null {
    if (!this.isIPv4()) return null;
    return this.normalized.split('.').map((octet) => parseInt(octet, 10));
  }

  /**
   * Get IPv6 segments
   */
  getSegments(): string[] | null {
    if (!this.isIPv6()) return null;
    return this.normalized.split(':');
  }

  /**
   * Convert IPv4 to decimal (unsigned)
   */
  toDecimal(): number | null {
    if (!this.isIPv4()) return null;
    const octets = this.getOctets()!;
    // Use unsigned right shift to ensure positive result
    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  }

  /**
   * Convert IPv4 to binary string
   */
  toBinary(): string | null {
    if (!this.isIPv4()) return null;
    const octets = this.getOctets()!;
    return octets.map((octet) => octet.toString(2).padStart(8, '0')).join('.');
  }

  /**
   * Check if private IP
   */
  isPrivate(): boolean {
    if (this.isIPv4()) {
      const octets = this.getOctets()!;
      return (
        // 10.0.0.0/8
        octets[0] === 10 ||
        // 172.16.0.0/12
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        // 192.168.0.0/16
        (octets[0] === 192 && octets[1] === 168)
      );
    } else {
      const normalized = this.normalized;
      return (
        // fc00::/7 (Unique Local Addresses)
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        // fe80::/10 (Link-local)
        normalized.startsWith('fe80')
      );
    }
  }

  /**
   * Check if loopback
   */
  isLoopback(): boolean {
    if (this.isIPv4()) {
      const octets = this.getOctets()!;
      return octets[0] === 127;
    } else {
      return this.normalized === '0000:0000:0000:0000:0000:0000:0000:0001' || this.value === '::1';
    }
  }

  /**
   * Check if link-local
   */
  isLinkLocal(): boolean {
    if (this.isIPv4()) {
      const octets = this.getOctets()!;
      return octets[0] === 169 && octets[1] === 254;
    } else {
      return this.normalized.startsWith('fe80');
    }
  }

  /**
   * Check if multicast
   */
  isMulticast(): boolean {
    if (this.isIPv4()) {
      const octets = this.getOctets()!;
      return octets[0] >= 224 && octets[0] <= 239;
    } else {
      return this.normalized.startsWith('ff');
    }
  }

  /**
   * Check if broadcast (IPv4 only)
   */
  isBroadcast(): boolean {
    if (!this.isIPv4()) return false;
    const octets = this.getOctets()!;
    return octets.every((octet) => octet === 255);
  }

  /**
   * Check if in CIDR range
   */
  isInRange(cidr: string): boolean {
    const [rangeIp, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    if (this.isIPv4()) {
      const rangeAddr = new IPAddress(rangeIp);
      if (!rangeAddr.isIPv4()) return false;

      const ipDecimal = this.toDecimal()!;
      const rangeDecimal = rangeAddr.toDecimal()!;
      const mask = (0xffffffff << (32 - prefix)) >>> 0;

      return (ipDecimal & mask) === (rangeDecimal & mask);
    } else {
      // Simplified IPv6 range check (full implementation would be more complex)
      if (prefix === 128) {
        return this.normalized === new IPAddress(rangeIp).normalized;
      }
      // For other prefix lengths, compare the prefix portion
      const segments = Math.floor(prefix / 16);
      const thisSegments = this.getSegments()!;
      const rangeSegments = new IPAddress(rangeIp).getSegments()!;

      for (let i = 0; i < segments; i++) {
        if (thisSegments[i] !== rangeSegments[i]) return false;
      }

      return true;
    }
  }

  /**
   * Get next IP address
   */
  next(): IPAddress | null {
    if (this.isIPv4()) {
      const decimal = this.toDecimal()!;
      if (decimal >= 4294967295) return null; // Max IPv4
      return IPAddress.fromDecimal(decimal + 1);
    }
    // IPv6 increment is complex, return null for now
    return null;
  }

  /**
   * Get previous IP address
   */
  previous(): IPAddress | null {
    if (this.isIPv4()) {
      const decimal = this.toDecimal()!;
      if (decimal <= 0) return null;
      return IPAddress.fromDecimal(decimal - 1);
    }
    // IPv6 decrement is complex, return null for now
    return null;
  }

  /**
   * Get IP info
   */
  getInfo(): IPAddressInfo {
    return {
      version: this.version,
      octets: this.getOctets() || undefined,
      segments: this.getSegments() || undefined,
      decimal: this.toDecimal() || undefined,
      isPrivate: this.isPrivate(),
      isLoopback: this.isLoopback(),
      isLinkLocal: this.isLinkLocal(),
      isMulticast: this.isMulticast(),
    };
  }

  /**
   * Comparison
   */
  equals(other: IPAddress | string): boolean {
    const otherIp = typeof other === 'string' ? new IPAddress(other) : other;
    return this.normalized === otherIp.normalized;
  }

  /**
   * Compare IPv4 addresses
   */
  compareTo(other: IPAddress): number {
    if (this.version !== other.version) {
      return this.version === 'IPv4' ? -1 : 1;
    }

    if (this.isIPv4()) {
      const thisDecimal = this.toDecimal()!;
      const otherDecimal = other.toDecimal()!;
      return thisDecimal - otherDecimal;
    }

    // For IPv6, string comparison of normalized form
    return this.normalized.localeCompare(other.normalized);
  }

  lessThan(other: IPAddress): boolean {
    return this.compareTo(other) < 0;
  }

  greaterThan(other: IPAddress): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Serialization
   */
  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }

  static fromJSON(json: string): IPAddress {
    return new IPAddress(json);
  }

  /**
   * Validation
   */
  static isValid(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return IPAddress.isValidIPv4(value) || IPAddress.isValidIPv6(value);
  }

  static isValidIPv4(value: string): boolean {
    if (!IPAddress.IPv4_REGEX.test(value)) return false;
    const octets = value.split('.').map((o) => parseInt(o, 10));
    return octets.every((octet) => octet >= 0 && octet <= 255);
  }

  static isValidIPv6(value: string): boolean {
    return IPAddress.IPv6_REGEX.test(value);
  }
}

// Zod schemas
export const IPv4Schema = z
  .string()
  .refine((val) => IPAddress.isValidIPv4(val), { message: 'Invalid IPv4 address' })
  .transform((val) => new IPAddress(val));

export const IPv6Schema = z
  .string()
  .refine((val) => IPAddress.isValidIPv6(val), { message: 'Invalid IPv6 address' })
  .transform((val) => new IPAddress(val));

export const IPAddressSchema = z
  .string()
  .refine((val) => IPAddress.isValid(val), { message: 'Invalid IP address' })
  .transform((val) => new IPAddress(val));
