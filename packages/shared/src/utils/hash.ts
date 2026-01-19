import { createHash } from 'crypto';

/**
 * Generate a SHA-256 hash of content
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generate a short hash (first 12 characters of SHA-256)
 */
export function shortHash(content: string): string {
  return hashContent(content).slice(0, 12);
}

/**
 * Generate a hash for an API key (for storage)
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

export interface ApiKeyResult {
  key: string;
  prefix: string;
  hash: string;
}

/**
 * Generate a random API key with prefix and hash
 */
export function generateApiKey(prefixParam: string = 'wgpt'): ApiKeyResult {
  const randomPart = Array.from({ length: 32 }, () => 
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(
      Math.floor(Math.random() * 62)
    )
  ).join('');
  
  const key = `${prefixParam}_${randomPart}`;
  const hash = hashApiKey(key);
  
  return {
    key,
    prefix: prefixParam,
    hash,
  };
}



