// src/shared/value-objects/__tests__/url.value-object.test.ts
import { Url } from '../url.value-object';

describe('URL Value Object', () => {
  describe('constructor', () => {
    it('should create URL from string', () => {
      const url = new Url('https://example.com/path');
      expect(url.getValue()).toBe('https://example.com/path');
    });

    it('should create URL from URL object', () => {
      const urlObj = new URL('https://example.com');
      const url = new Url(urlObj);
      expect(url.getValue()).toBe('https://example.com/');
    });

    it('should handle relative URLs with base', () => {
      const url = new Url('/path/to/resource', 'https://example.com');
      expect(url.getValue()).toBe('https://example.com/path/to/resource');
    });

    it('should normalize URLs', () => {
      const url = new Url('https://example.com:443/path');
      expect(url.getValue()).toBe('https://example.com/path');
    });

    it('should reject invalid URLs', () => {
      expect(() => new Url('not a url')).toThrow('Invalid URL');
      expect(() => new Url('')).toThrow('Invalid URL');
      expect(() => new Url('://missing-protocol')).toThrow('Invalid URL');
    });

    it('should handle various protocols', () => {
      const protocols = [
        'https://example.com',
        'http://example.com',
        'ftp://example.com',
        'ws://example.com',
        'wss://example.com',
        'mailto:user@example.com',
        'tel:+1234567890',
        'file:///path/to/file',
      ];

      protocols.forEach(urlString => {
        expect(() => new Url(urlString)).not.toThrow();
      });
    });
  });

  describe('factory methods', () => {
    it('should create URL', () => {
      const url = Url.create('https://example.com');
      expect(url.getValue()).toBe('https://example.com/');
    });

    it('should tryCreate return null for invalid', () => {
      expect(Url.tryCreate('invalid url')).toBeNull();
      expect(Url.tryCreate(123)).toBeNull();
      expect(Url.tryCreate(null)).toBeNull();
    });

    it('should parse URL', () => {
      const url = Url.parse('https://example.com/path?query=value#hash');
      expect(url.getValue()).toBe('https://example.com/path?query=value#hash');
    });
  });

  describe('protocol operations', () => {
    const url = new Url('https://example.com:8080/path');

    it('should get protocol', () => {
      expect(url.getProtocol()).toBe('https');
    });

    it('should change protocol', () => {
      const httpUrl = url.withProtocol('http');
      expect(httpUrl.getProtocol()).toBe('http');
      expect(httpUrl.getValue()).toBe('http://example.com:8080/path');
    });

    it('should check if secure', () => {
      expect(new Url('https://example.com').isSecure()).toBe(true);
      expect(new Url('wss://example.com').isSecure()).toBe(true);
      expect(new Url('ftps://example.com').isSecure()).toBe(true);
      expect(new Url('http://example.com').isSecure()).toBe(false);
    });

    it('should check if safe protocol', () => {
      expect(new Url('https://example.com').isSafeProtocol()).toBe(true);
      expect(new Url('http://example.com').isSafeProtocol()).toBe(true);
      expect(new Url('javascript:alert(1)').isSafeProtocol()).toBe(false);
      expect(new Url('file:///etc/passwd').isSafeProtocol()).toBe(false);
    });
  });

  describe('host operations', () => {
    it('should get hostname', () => {
      const url = new Url('https://subdomain.example.com:8080/path');
      expect(url.getHostname()).toBe('subdomain.example.com');
    });

    it('should get host with port', () => {
      const url = new Url('https://example.com:8080/path');
      expect(url.getHost()).toBe('example.com:8080');
    });

    it('should get port', () => {
      expect(new Url('https://example.com:8080').getPort()).toBe(8080);
      expect(new Url('https://example.com').getPort()).toBe(443);
      expect(new Url('http://example.com').getPort()).toBe(80);
    });

    it('should get domain', () => {
      expect(new Url('https://subdomain.example.com').getDomain()).toBe('example.com');
      expect(new Url('https://example.co.uk').getDomain()).toBe('co.uk');
      expect(new Url('https://localhost').getDomain()).toBe('localhost');
    });

    it('should get subdomain', () => {
      expect(new Url('https://api.v2.example.com').getSubdomain()).toBe('api.v2');
      expect(new Url('https://www.example.com').getSubdomain()).toBe('www');
      expect(new Url('https://example.com').getSubdomain()).toBeNull();
    });

    it('should change host', () => {
      const url = new Url('https://example.com/path');
      const newUrl = url.withHost('newhost.com:9000');
      expect(newUrl.getValue()).toBe('https://newhost.com:9000/path');
    });

    it('should change port', () => {
      const url = new Url('https://example.com/path');
      const withPort = url.withPort(8443);
      expect(withPort.getValue()).toBe('https://example.com:8443/path');
      
      const withoutPort = withPort.withPort(null);
      expect(withoutPort.getValue()).toBe('https://example.com/path');
    });
  });

  describe('path operations', () => {
    it('should get pathname', () => {
      const url = new Url('https://example.com/path/to/resource');
      expect(url.getPathname()).toBe('/path/to/resource');
    });

    it('should get path segments', () => {
      const url = new Url('https://example.com/api/v1/users/123');
      expect(url.getPathSegments()).toEqual(['api', 'v1', 'users', '123']);
    });

    it('should change pathname', () => {
      const url = new Url('https://example.com/old/path');
      const newUrl = url.withPathname('/new/path');
      expect(newUrl.getValue()).toBe('https://example.com/new/path');
    });

    it('should append path', () => {
      const url = new Url('https://example.com/api/v1');
      const appended = url.appendPath('users/123');
      expect(appended.getValue()).toBe('https://example.com/api/v1/users/123');
      
      const appendedWithSlash = url.appendPath('/users/456');
      expect(appendedWithSlash.getValue()).toBe('https://example.com/api/v1/users/456');
    });
  });

  describe('query string operations', () => {
    const url = new Url('https://example.com/path?foo=bar&baz=qux&arr=1&arr=2');

    it('should get query parameters', () => {
      expect(url.getQueryParam('foo')).toBe('bar');
      expect(url.getQueryParam('missing')).toBeNull();
    });

    it('should get multiple query parameters', () => {
      expect(url.getQueryParams('arr')).toEqual(['1', '2']);
      expect(url.getQueryParams('foo')).toEqual(['bar']);
    });

    it('should check query parameter existence', () => {
      expect(url.hasQueryParam('foo')).toBe(true);
      expect(url.hasQueryParam('missing')).toBe(false);
    });

    it('should add query parameter', () => {
      const newUrl = url.withQueryParam('new', 'value');
      expect(newUrl.getQueryParam('new')).toBe('value');
      expect(newUrl.getQueryParam('foo')).toBe('bar');
    });

    it('should set multiple query parameters', () => {
      const newUrl = url.withQueryParams({
        key1: 'value1',
        key2: ['a', 'b', 'c'],
      });
      expect(newUrl.getQueryParam('key1')).toBe('value1');
      expect(newUrl.getQueryParams('key2')).toEqual(['a', 'b', 'c']);
      expect(newUrl.hasQueryParam('foo')).toBe(false); // Original params removed
    });

    it('should remove query parameter', () => {
      const newUrl = url.withoutQueryParam('foo');
      expect(newUrl.hasQueryParam('foo')).toBe(false);
      expect(newUrl.hasQueryParam('baz')).toBe(true);
    });

    it('should remove all query parameters', () => {
      const newUrl = url.withoutQueryParams();
      expect(newUrl.getValue()).toBe('https://example.com/path');
    });
  });

  describe('hash operations', () => {
    const url = new Url('https://example.com/path#section');

    it('should get hash', () => {
      expect(url.getHash()).toBe('#section');
      expect(url.getHashValue()).toBe('section');
    });

    it('should set hash', () => {
      const newUrl = url.withHash('newsection');
      expect(newUrl.getHash()).toBe('#newsection');
      
      const withHashSymbol = url.withHash('#anothersection');
      expect(withHashSymbol.getHash()).toBe('#anothersection');
    });

    it('should remove hash', () => {
      const newUrl = url.withoutHash();
      expect(newUrl.getValue()).toBe('https://example.com/path');
    });
  });

  describe('authentication', () => {
    it('should handle credentials in URL', () => {
      const url = new Url('https://user:pass@example.com/path');
      expect(url.getUsername()).toBe('user');
      expect(url.getPassword()).toBe('pass');
      expect(url.hasCredentials()).toBe(true);
    });

    it('should add authentication', () => {
      const url = new Url('https://example.com/path');
      const withAuth = url.withAuth('user', 'pass');
      expect(withAuth.getValue()).toBe('https://user:pass@example.com/path');
    });

    it('should remove authentication', () => {
      const url = new Url('https://user:pass@example.com/path');
      const withoutAuth = url.withoutAuth();
      expect(withoutAuth.getValue()).toBe('https://example.com/path');
      expect(withoutAuth.hasCredentials()).toBe(false);
    });
  });

  describe('comparison', () => {
    it('should check equality', () => {
      const url1 = new Url('https://example.com/path?query=value#hash');
      const url2 = new Url('https://example.com/path?query=value#hash');
      const url3 = new Url('https://example.com/path?query=other#hash');
      
      expect(url1.equals(url2)).toBe(true);
      expect(url1.equals(url3)).toBe(false);
      expect(url1.equals('https://example.com/path?query=value#hash')).toBe(true);
    });

    it('should check equality ignoring hash', () => {
      const url1 = new Url('https://example.com/path#hash1');
      const url2 = new Url('https://example.com/path#hash2');
      
      expect(url1.equalsIgnoringHash(url2)).toBe(true);
    });

    it('should check equality ignoring query', () => {
      const url1 = new Url('https://example.com/path?a=1');
      const url2 = new Url('https://example.com/path?b=2');
      
      expect(url1.equalsIgnoringQuery(url2)).toBe(true);
    });

    it('should check same origin', () => {
      const url1 = new Url('https://example.com/path1');
      const url2 = new Url('https://example.com/path2');
      const url3 = new Url('https://other.com/path');
      const url4 = new Url('http://example.com/path');
      
      expect(url1.isSameOrigin(url2)).toBe(true);
      expect(url1.isSameOrigin(url3)).toBe(false);
      expect(url1.isSameOrigin(url4)).toBe(false); // Different protocol
    });
  });

  describe('safety checks', () => {
    it('should check safe redirect', () => {
      expect(new Url('https://example.com/path').isSafeRedirect()).toBe(true);
      expect(new Url('http://example.com/path').isSafeRedirect()).toBe(true);
      expect(new Url('javascript:alert(1)').isSafeRedirect()).toBe(false);
      expect(new Url('data:text/html,<script>alert(1)</script>').isSafeRedirect()).toBe(false);
    });

    it('should check safe redirect with allowed hosts', () => {
      const allowedHosts = ['trusted.com', 'safe.com'];
      
      expect(new Url('https://trusted.com/path').isSafeRedirect(allowedHosts)).toBe(true);
      expect(new Url('https://safe.com/path').isSafeRedirect(allowedHosts)).toBe(true);
      expect(new Url('https://evil.com/path').isSafeRedirect(allowedHosts)).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should get origin', () => {
      const url = new Url('https://example.com:8080/path');
      expect(url.getOrigin()).toBe('https://example.com:8080');
    });

    it('should get filename', () => {
      expect(new Url('https://example.com/path/file.pdf').getFilename()).toBe('file.pdf');
      expect(new Url('https://example.com/path/document.tar.gz').getFilename()).toBe('document.tar.gz');
      expect(new Url('https://example.com/path/').getFilename()).toBeNull();
      expect(new Url('https://example.com/directory').getFilename()).toBeNull();
    });

    it('should get file extension', () => {
      expect(new Url('https://example.com/file.pdf').getFileExtension()).toBe('pdf');
      expect(new Url('https://example.com/file.PDF').getFileExtension()).toBe('pdf');
      expect(new Url('https://example.com/archive.tar.gz').getFileExtension()).toBe('gz');
      expect(new Url('https://example.com/no-extension').getFileExtension()).toBeNull();
    });

    it('should convert to relative', () => {
      const url = new Url('https://example.com/path/to/resource?query=value#hash');
      const base = new Url('https://example.com/');
      
      expect(url.toRelative(base)).toBe('/path/to/resource?query=value#hash');
      
      const differentOrigin = new Url('https://other.com/');
      expect(url.toRelative(differentOrigin)).toBe('https://example.com/path/to/resource?query=value#hash');
    });
  });

  describe('serialization', () => {
    const url = new Url('https://example.com/path?query=value#hash');

    it('should convert to string', () => {
      expect(url.toString()).toBe('https://example.com/path?query=value#hash');
      expect(String(url)).toBe('https://example.com/path?query=value#hash');
    });

    it('should serialize to JSON', () => {
      expect(url.toJSON()).toBe('https://example.com/path?query=value#hash');
      expect(JSON.stringify({ url })).toBe('{"url":"https://example.com/path?query=value#hash"}');
    });

    it('should deserialize from JSON', () => {
      const deserialized = Url.fromJSON('https://example.com/path');
      expect(deserialized.getValue()).toBe('https://example.com/path');
    });
  });

  describe('validation', () => {
    it('should validate URLs', () => {
      expect(Url.isValid('https://example.com')).toBe(true);
      expect(Url.isValid('http://localhost:3000')).toBe(true);
      expect(Url.isValid('ftp://files.example.com')).toBe(true);
      expect(Url.isValid('not a url')).toBe(false);
      expect(Url.isValid('')).toBe(false);
      expect(Url.isValid(123)).toBe(false);
    });

    it('should validate HTTP URLs specifically', () => {
      expect(Url.isValidHttpUrl('https://example.com')).toBe(true);
      expect(Url.isValidHttpUrl('http://example.com')).toBe(true);
      expect(Url.isValidHttpUrl('ftp://example.com')).toBe(false);
      expect(Url.isValidHttpUrl('ws://example.com')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle URLs with special characters', () => {
      const url = new Url('https://example.com/path with spaces');
      expect(url.getValue()).toBe('https://example.com/path%20with%20spaces');
    });

    it('should handle international domains', () => {
      const url = new Url('https://münchen.de/path');
      expect(url.getHostname()).toBe('xn--mnchen-3ya.de');
    });

    it('should handle empty path', () => {
      const url = new Url('https://example.com');
      expect(url.getPathname()).toBe('/');
      expect(url.getPathSegments()).toEqual([]);
    });

    it('should handle complex query strings', () => {
      const url = new Url('https://example.com/?array[]=1&array[]=2&obj[key]=value');
      expect(url.getQueryParam('array[]')).toBe('1');
      expect(url.getQueryParams('array[]')).toEqual(['1', '2']);
      expect(url.getQueryParam('obj[key]')).toBe('value');
    });
  });
});