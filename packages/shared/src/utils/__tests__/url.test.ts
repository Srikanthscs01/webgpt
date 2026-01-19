import { describe, expect, it } from 'vitest';
import {
  normalizeUrl,
  isSameOrigin,
  extractDomain,
  urlMatchesPatterns,
  resolveUrl,
  isValidUrl,
} from '../url';

describe('normalizeUrl', () => {
  it('should lowercase protocol and hostname', () => {
    expect(normalizeUrl('HTTPS://EXAMPLE.COM/Path')).toBe('https://example.com/Path');
  });

  it('should remove fragments', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('should remove tracking parameters', () => {
    expect(normalizeUrl('https://example.com/page?utm_source=test&id=123')).toBe(
      'https://example.com/page?id=123'
    );
  });

  it('should remove multiple tracking parameters', () => {
    expect(
      normalizeUrl('https://example.com/page?utm_source=test&utm_medium=email&fbclid=abc')
    ).toBe('https://example.com/page');
  });

  it('should sort remaining query parameters', () => {
    expect(normalizeUrl('https://example.com/page?z=1&a=2&m=3')).toBe(
      'https://example.com/page?a=2&m=3&z=1'
    );
  });

  it('should optionally remove trailing slashes', () => {
    expect(normalizeUrl('https://example.com/page/', { removeTrailingSlash: true })).toBe(
      'https://example.com/page'
    );
  });

  it('should keep trailing slash on root path', () => {
    expect(normalizeUrl('https://example.com/', { removeTrailingSlash: true })).toBe(
      'https://example.com/'
    );
  });

  it('should handle invalid URLs gracefully', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });
});

describe('isSameOrigin', () => {
  it('should return true for same origin URLs', () => {
    expect(isSameOrigin('https://example.com/page1', 'https://example.com/page2')).toBe(true);
  });

  it('should return false for different origins', () => {
    expect(isSameOrigin('https://example.com/', 'https://other.com/')).toBe(false);
  });

  it('should return false for different protocols', () => {
    expect(isSameOrigin('https://example.com/', 'http://example.com/')).toBe(false);
  });

  it('should return false for different ports', () => {
    expect(isSameOrigin('https://example.com/', 'https://example.com:8080/')).toBe(false);
  });

  it('should handle invalid URLs', () => {
    expect(isSameOrigin('not-a-url', 'https://example.com/')).toBe(false);
  });
});

describe('extractDomain', () => {
  it('should extract domain from URL', () => {
    expect(extractDomain('https://www.example.com/page')).toBe('www.example.com');
  });

  it('should return null for invalid URLs', () => {
    expect(extractDomain('not-a-url')).toBe(null);
  });
});

describe('urlMatchesPatterns', () => {
  it('should match exact patterns', () => {
    expect(urlMatchesPatterns('https://example.com/page', ['https://example.com/page'])).toBe(
      true
    );
  });

  it('should match wildcard patterns', () => {
    expect(urlMatchesPatterns('https://example.com/blog/post-1', ['*/blog/*'])).toBe(true);
  });

  it('should return false for non-matching patterns', () => {
    expect(urlMatchesPatterns('https://example.com/page', ['https://other.com/*'])).toBe(false);
  });

  it('should match any of multiple patterns', () => {
    expect(
      urlMatchesPatterns('https://example.com/page', [
        'https://other.com/*',
        'https://example.com/*',
      ])
    ).toBe(true);
  });
});

describe('resolveUrl', () => {
  it('should resolve relative URLs', () => {
    expect(resolveUrl('https://example.com/page/', './other')).toBe(
      'https://example.com/page/other'
    );
  });

  it('should resolve absolute paths', () => {
    expect(resolveUrl('https://example.com/page/', '/other')).toBe('https://example.com/other');
  });

  it('should handle full URLs', () => {
    expect(resolveUrl('https://example.com/', 'https://other.com/page')).toBe(
      'https://other.com/page'
    );
  });
});

describe('isValidUrl', () => {
  it('should return true for valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});



