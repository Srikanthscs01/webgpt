import { randomBytes } from 'crypto';

/**
 * Validates API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^wgpt_[A-Za-z0-9_-]{32}$/.test(key);
}

/**
 * Generates a site key (shorter than API key)
 * Format: <random_16_chars>
 */
export function generateSiteKey(): string {
  return randomBytes(12).toString('base64url').substring(0, 16);
}

