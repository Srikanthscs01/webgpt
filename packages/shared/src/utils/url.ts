/**
 * URL normalization utilities for consistent URL handling across crawling and retrieval
 */

/**
 * Normalize a URL for consistent comparison
 * - Removes fragments
 * - Removes tracking parameters
 * - Normalizes trailing slashes
 * - Lowercases protocol and hostname
 */
export function normalizeUrl(url: string, options: { removeTrailingSlash?: boolean } = {}): string {
  try {
    const parsed = new URL(url);
    
    // Lowercase protocol and hostname
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    
    // Remove fragment
    parsed.hash = '';
    
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'mc_eid', 'ref', '_ga', 'source'
    ];
    
    trackingParams.forEach(param => {
      parsed.searchParams.delete(param);
    });
    
    // Sort remaining params for consistency
    parsed.searchParams.sort();
    
    let result = parsed.toString();
    
    // Handle trailing slashes
    if (options.removeTrailingSlash && result.endsWith('/') && parsed.pathname !== '/') {
      result = result.slice(0, -1);
    }
    
    return result;
  } catch {
    return url;
  }
}

/**
 * Check if two URLs are the same origin
 */
export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    const parsed1 = new URL(url1);
    const parsed2 = new URL(url2);
    return parsed1.origin === parsed2.origin;
  } catch {
    return false;
  }
}

/**
 * Extract the domain from a URL
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if a URL matches any pattern in a list
 * Supports glob-like patterns with * wildcard
 */
export function urlMatchesPatterns(url: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      'i'
    );
    if (regex.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve a relative URL against a base URL
 */
export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the path without query parameters
 */
export function getPathWithoutQuery(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url;
  }
}



