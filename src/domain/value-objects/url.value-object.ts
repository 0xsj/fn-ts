// src/shared/value-objects/url.value-object.ts
import { z } from 'zod';

export type URLProtocol =
  | 'http'
  | 'https'
  | 'ftp'
  | 'ftps'
  | 'ws'
  | 'wss'
  | 'mailto'
  | 'tel'
  | 'file';

export interface URLComponents {
  protocol: string;
  username?: string;
  password?: string;
  hostname: string;
  port?: number;
  pathname: string;
  search?: string;
  hash?: string;
}

/**
 * URL value object with validation and manipulation capabilities
 */
export class Url {
  private readonly url: URL;
  private static readonly SAFE_PROTOCOLS = new Set(['http', 'https']);
  private static readonly HOSTNAME_PROTOCOLS = new Set([
    'http',
    'https',
    'ftp',
    'ftps',
    'ws',
    'wss',
  ]);
  private static readonly DEFAULT_PORTS: Record<string, number> = {
    'http:': 80,
    'https:': 443,
    'ftp:': 21,
    'ftps:': 990,
    'ws:': 80,
    'wss:': 443,
  };

  constructor(value: string | URL, baseUrl?: string | URL) {
    try {
      if (typeof value === 'string') {
        // Handle relative URLs
        if (baseUrl) {
          this.url = new URL(value, baseUrl);
        } else {
          this.url = new URL(value);
        }
      } else {
        this.url = new URL(value.href);
      }
    } catch (error) {
      throw new Error(`Invalid URL: ${value}`);
    }

    // Only validate hostname for protocols that require it
    const protocol = this.url.protocol.replace(':', '');
    if (Url.HOSTNAME_PROTOCOLS.has(protocol) && !this.url.hostname) {
      throw new Error('URL must have a hostname');
    }
  }

  /**
   * Factory methods
   */
  static create(value: string | URL, baseUrl?: string | URL): Url {
    return new Url(value, baseUrl);
  }

  static tryCreate(value: unknown, baseUrl?: string | URL): Url | null {
    try {
      if (typeof value === 'string' || value instanceof URL) {
        return new Url(value, baseUrl);
      }
      return null;
    } catch {
      return null;
    }
  }

  static parse(value: string, baseUrl?: string): Url {
    return new Url(value, baseUrl);
  }

  /**
   * Get the full URL string
   */
  getValue(): string {
    return this.url.href;
  }

  /**
   * Get URL components
   */
  getComponents(): URLComponents {
    return {
      protocol: this.url.protocol.replace(':', ''),
      username: this.url.username || undefined,
      password: this.url.password || undefined,
      hostname: this.url.hostname,
      port: this.getPort() || undefined,
      pathname: this.url.pathname,
      search: this.url.search || undefined,
      hash: this.url.hash || undefined,
    };
  }

  /**
   * Protocol operations
   */
  getProtocol(): string {
    return this.url.protocol.replace(':', '');
  }

  withProtocol(protocol: string): Url {
    const newUrl = new URL(this.url.href);
    newUrl.protocol = protocol;
    return new Url(newUrl);
  }

  isSecure(): boolean {
    return (
      this.url.protocol === 'https:' ||
      this.url.protocol === 'wss:' ||
      this.url.protocol === 'ftps:'
    );
  }

  isSafeProtocol(): boolean {
    return Url.SAFE_PROTOCOLS.has(this.getProtocol());
  }

  requiresHostname(): boolean {
    return Url.HOSTNAME_PROTOCOLS.has(this.getProtocol());
  }

  /**
   * Host operations
   */
  getHostname(): string {
    return this.url.hostname;
  }

  getHost(): string {
    return this.url.host;
  }

  getPort(): number | null {
    if (this.url.port) {
      return parseInt(this.url.port);
    }
    // Return default port for protocol
    const defaultPort = Url.DEFAULT_PORTS[this.url.protocol];
    return defaultPort || null;
  }

  getDomain(): string {
    if (!this.url.hostname) return '';
    const parts = this.url.hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return this.url.hostname;
  }

  getSubdomain(): string | null {
    if (!this.url.hostname) return null;
    const parts = this.url.hostname.split('.');
    if (parts.length > 2) {
      return parts.slice(0, -2).join('.');
    }
    return null;
  }

  withHost(host: string): Url {
    const newUrl = new URL(this.url.href);
    newUrl.host = host;
    return new Url(newUrl);
  }

  withPort(port: number | null): Url {
    const newUrl = new URL(this.url.href);
    if (port === null) {
      newUrl.port = '';
    } else {
      newUrl.port = port.toString();
    }
    return new Url(newUrl);
  }

  /**
   * Path operations
   */
  getPathname(): string {
    return this.url.pathname;
  }

  getPathSegments(): string[] {
    return this.url.pathname.split('/').filter((segment) => segment.length > 0);
  }

  withPathname(pathname: string): Url {
    const newUrl = new URL(this.url.href);
    newUrl.pathname = pathname;
    return new Url(newUrl);
  }

  appendPath(path: string): Url {
    const newUrl = new URL(this.url.href);
    let pathname = newUrl.pathname;
    if (!pathname.endsWith('/')) {
      pathname += '/';
    }
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    newUrl.pathname = pathname + path;
    return new Url(newUrl);
  }

  /**
   * Query string operations
   */
  getSearchParams(): URLSearchParams {
    return new URLSearchParams(this.url.searchParams);
  }

  getQueryParam(key: string): string | null {
    return this.url.searchParams.get(key);
  }

  getQueryParams(key: string): string[] {
    return this.url.searchParams.getAll(key);
  }

  hasQueryParam(key: string): boolean {
    return this.url.searchParams.has(key);
  }

  withQueryParam(key: string, value: string): Url {
    const newUrl = new URL(this.url.href);
    newUrl.searchParams.set(key, value);
    return new Url(newUrl);
  }

  withQueryParams(params: Record<string, string | string[]>): Url {
    const newUrl = new URL(this.url.href);
    newUrl.searchParams.forEach((_, key) => newUrl.searchParams.delete(key));

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => newUrl.searchParams.append(key, v));
      } else {
        newUrl.searchParams.set(key, value);
      }
    });

    return new Url(newUrl);
  }

  withoutQueryParam(key: string): Url {
    const newUrl = new URL(this.url.href);
    newUrl.searchParams.delete(key);
    return new Url(newUrl);
  }

  withoutQueryParams(): Url {
    const newUrl = new URL(this.url.href);
    newUrl.search = '';
    return new Url(newUrl);
  }

  /**
   * Hash operations
   */
  getHash(): string {
    return this.url.hash;
  }

  getHashValue(): string {
    return this.url.hash.replace('#', '');
  }

  withHash(hash: string): Url {
    const newUrl = new URL(this.url.href);
    newUrl.hash = hash.startsWith('#') ? hash : '#' + hash;
    return new Url(newUrl);
  }

  withoutHash(): Url {
    const newUrl = new URL(this.url.href);
    newUrl.hash = '';
    return new Url(newUrl);
  }

  /**
   * Authentication
   */
  getUsername(): string | null {
    return this.url.username || null;
  }

  getPassword(): string | null {
    return this.url.password || null;
  }

  withAuth(username: string, password?: string): Url {
    const newUrl = new URL(this.url.href);
    newUrl.username = username;
    if (password !== undefined) {
      newUrl.password = password;
    }
    return new Url(newUrl);
  }

  withoutAuth(): Url {
    const newUrl = new URL(this.url.href);
    newUrl.username = '';
    newUrl.password = '';
    return new Url(newUrl);
  }

  /**
   * Comparison and validation
   */
  equals(other: Url | string): boolean {
    const otherUrl = typeof other === 'string' ? new Url(other) : other;
    return this.url.href === otherUrl.url.href;
  }

  equalsIgnoringHash(other: Url | string): boolean {
    const otherUrl = typeof other === 'string' ? new Url(other) : other;
    const thisWithoutHash = this.withoutHash();
    const otherWithoutHash = otherUrl.withoutHash();
    return thisWithoutHash.equals(otherWithoutHash);
  }

  equalsIgnoringQuery(other: Url | string): boolean {
    const otherUrl = typeof other === 'string' ? new Url(other) : other;
    const thisWithoutQuery = this.withoutQueryParams();
    const otherWithoutQuery = otherUrl.withoutQueryParams();
    return thisWithoutQuery.equals(otherWithoutQuery);
  }

  isSameOrigin(other: Url | string): boolean {
    const otherUrl = typeof other === 'string' ? new Url(other) : other;
    return this.url.origin === otherUrl.url.origin;
  }

  isAbsolute(): boolean {
    return true; // URL constructor always creates absolute URLs
  }

  /**
   * Safety checks
   */
  isSafeRedirect(allowedHosts?: string[]): boolean {
    // Check protocol
    if (!this.isSafeProtocol()) {
      return false;
    }

    // If allowed hosts specified, check against them
    if (allowedHosts && allowedHosts.length > 0) {
      return allowedHosts.includes(this.url.hostname);
    }

    // By default, only allow same-origin redirects
    return true;
  }

  hasCredentials(): boolean {
    return !!(this.url.username || this.url.password);
  }

  /**
   * Utility methods
   */
  getOrigin(): string {
    return this.url.origin;
  }

  getFilename(): string | null {
    const segments = this.getPathSegments();
    if (segments.length === 0) return null;

    const lastSegment = segments[segments.length - 1];
    if (lastSegment.includes('.')) {
      return lastSegment;
    }

    return null;
  }

  getFileExtension(): string | null {
    const filename = this.getFilename();
    if (!filename) return null;

    const parts = filename.split('.');
    if (parts.length < 2) return null;

    return parts[parts.length - 1].toLowerCase();
  }

  /**
   * Transformation
   */
  toRelative(baseUrl: string | Url): string {
    const base = typeof baseUrl === 'string' ? new Url(baseUrl) : baseUrl;

    if (!this.isSameOrigin(base)) {
      return this.url.href;
    }

    let relative = this.url.pathname;
    if (this.url.search) relative += this.url.search;
    if (this.url.hash) relative += this.url.hash;

    return relative;
  }

  /**
   * Special protocol getters
   */
  isMailto(): boolean {
    return this.url.protocol === 'mailto:';
  }

  isTel(): boolean {
    return this.url.protocol === 'tel:';
  }

  isFile(): boolean {
    return this.url.protocol === 'file:';
  }

  isJavaScript(): boolean {
    return this.url.protocol === 'javascript:';
  }

  isData(): boolean {
    return this.url.protocol === 'data:';
  }

  /**
   * Get email address from mailto URL
   */
  getMailtoEmail(): string | null {
    if (!this.isMailto()) return null;
    return this.url.pathname;
  }

  /**
   * Get phone number from tel URL
   */
  getTelNumber(): string | null {
    if (!this.isTel()) return null;
    return this.url.pathname;
  }

  /**
   * Serialization
   */
  toString(): string {
    return this.url.href;
  }

  toJSON(): string {
    return this.url.href;
  }

  static fromJSON(json: string): Url {
    return new Url(json);
  }

  /**
   * Validation
   */
  static isValid(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  static isValidHttpUrl(value: unknown): boolean {
    if (!Url.isValid(value)) return false;
    try {
      const url = new URL(value as string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// Zod schema for validation
export const UrlSchema = z
  .string()
  .url()
  .transform((val) => new Url(val));
export const HttpUrlSchema = z
  .string()
  .url()
  .refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
    message: 'Must be an HTTP or HTTPS URL',
  })
  .transform((val) => new Url(val));
