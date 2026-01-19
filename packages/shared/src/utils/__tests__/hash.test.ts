import { describe, expect, it } from 'vitest';
import { hashContent, shortHash, hashApiKey, generateApiKey } from '../hash';

describe('hashContent', () => {
  it('should generate consistent hash for same content', () => {
    const content = 'Hello world';
    const hash1 = hashContent(content);
    const hash2 = hashContent(content);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different content', () => {
    const hash1 = hashContent('Hello');
    const hash2 = hashContent('World');
    expect(hash1).not.toBe(hash2);
  });

  it('should generate 64 character hex string', () => {
    const hash = hashContent('test');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

describe('shortHash', () => {
  it('should generate 12 character hash', () => {
    const hash = shortHash('test content');
    expect(hash).toHaveLength(12);
  });

  it('should be consistent', () => {
    const hash1 = shortHash('test');
    const hash2 = shortHash('test');
    expect(hash1).toBe(hash2);
  });
});

describe('hashApiKey', () => {
  it('should hash API key consistently', () => {
    const key = 'wgpt_abc123xyz';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });
});

describe('generateApiKey', () => {
  it('should generate key with default prefix', () => {
    const key = generateApiKey();
    expect(key).toMatch(/^wgpt_[a-zA-Z0-9]{32}$/);
  });

  it('should generate key with custom prefix', () => {
    const key = generateApiKey('custom');
    expect(key).toMatch(/^custom_[a-zA-Z0-9]{32}$/);
  });

  it('should generate unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});



