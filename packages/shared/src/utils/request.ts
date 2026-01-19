import { randomBytes } from 'crypto';

/**
 * Generates a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${randomBytes(8).toString('hex')}`;
}

