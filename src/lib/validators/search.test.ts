import { describe, it, expect } from 'vitest';
import { searchQuerySchema } from './search';

describe('Global Search Validators', () => {
  it('validates a basic search query with default type and limit', () => {
    const result = searchQuerySchema.safeParse({ q: 'distributed systems' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe('distributed systems');
      expect(result.data.type).toBe('all');
      expect(result.data.limit).toBe(20);
    }
  });

  it('validates specific entity types', () => {
    const types = ['all', 'projects', 'developers', 'posts', 'tasks'] as const;
    for (const type of types) {
      const result = searchQuerySchema.safeParse({ q: 'react', type });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(type);
      }
    }
  });

  it('rejects empty or whitespace query', () => {
    expect(searchQuerySchema.safeParse({ q: '' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
  });

  it('rejects overly long queries', () => {
    const longQuery = 'a'.repeat(101);
    expect(searchQuerySchema.safeParse({ q: longQuery }).success).toBe(false);
  });

  it('rejects invalid entity type', () => {
    expect(searchQuerySchema.safeParse({ q: 'rust', type: 'invalid_type' }).success).toBe(false);
  });

  it('clamps or enforces limit constraints', () => {
    expect(searchQuerySchema.safeParse({ q: 'test', limit: 0 }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: 'test', limit: 51 }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: 'test', limit: 15 }).success).toBe(true);
  });
});
