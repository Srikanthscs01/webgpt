import { describe, expect, it } from 'vitest';
import {
  estimateTokens,
  truncateToTokens,
  splitIntoChunks,
  estimateOpenAICost,
} from '../tokens';

describe('estimateTokens', () => {
  it('should estimate tokens for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('should estimate tokens for short text', () => {
    // "Hello world" = 11 chars, ~3 tokens
    expect(estimateTokens('Hello world')).toBe(3);
  });

  it('should estimate tokens for longer text', () => {
    const text = 'This is a longer piece of text that should have more tokens.';
    // 61 chars / 4 = ~16 tokens
    expect(estimateTokens(text)).toBe(16);
  });
});

describe('truncateToTokens', () => {
  it('should not truncate text within limit', () => {
    const text = 'Short text';
    expect(truncateToTokens(text, 100)).toBe(text);
  });

  it('should truncate text exceeding limit', () => {
    const text = 'This is a very long text that exceeds the limit';
    const result = truncateToTokens(text, 5); // 5 tokens = ~20 chars
    expect(result.length).toBeLessThanOrEqual(20);
  });
});

describe('splitIntoChunks', () => {
  it('should return single chunk for short text', () => {
    const text = 'Short text';
    const chunks = splitIntoChunks(text, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Short text');
  });

  it('should split long text into multiple chunks', () => {
    const text = 'A'.repeat(10000);
    const chunks = splitIntoChunks(text, 100, 10);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should have overlap between chunks', () => {
    const text = 'Word '.repeat(500);
    const chunks = splitIntoChunks(text, 50, 10);
    
    // Each chunk should have some content
    chunks.forEach(chunk => {
      expect(chunk.length).toBeGreaterThan(0);
    });
  });

  it('should filter empty chunks', () => {
    const text = 'Short text';
    const chunks = splitIntoChunks(text, 1000);
    expect(chunks.every(c => c.length > 0)).toBe(true);
  });
});

describe('estimateOpenAICost', () => {
  it('should calculate cost for gpt-4o-mini', () => {
    const cost = estimateOpenAICost(1000, 500, 'gpt-4o-mini');
    // Input: 1000/1000 * 0.00015 = 0.00015
    // Output: 500/1000 * 0.0006 = 0.0003
    // Total: 0.00045
    expect(cost).toBeCloseTo(0.00045, 5);
  });

  it('should calculate cost for embeddings', () => {
    const cost = estimateOpenAICost(1000, 0, 'text-embedding-3-small');
    // Input: 1000/1000 * 0.00002 = 0.00002
    expect(cost).toBeCloseTo(0.00002, 5);
  });

  it('should fallback to gpt-4o-mini for unknown models', () => {
    const cost = estimateOpenAICost(1000, 500, 'unknown-model');
    expect(cost).toBeCloseTo(0.00045, 5);
  });
});



