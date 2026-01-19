/**
 * Retry options
 */
export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  backoff?: 'linear' | 'exponential';
}

/**
 * Wraps a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, delayMs, backoff = 'exponential' } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = backoff === 'exponential' 
          ? delayMs * Math.pow(2, attempt)
          : delayMs * (attempt + 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

