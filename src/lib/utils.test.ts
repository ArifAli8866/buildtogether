import { describe, it, expect } from 'vitest';
import { cn, slugify } from './utils';

describe('Utility Functions', () => {
  it('cn() correctly combines class names and merges Tailwind classes', () => {
    const result = cn('px-4 py-2', 'bg-red-500', { 'text-white': true, 'opacity-50': false });
    expect(result).toBe('px-4 py-2 bg-red-500 text-white');

    // Tailwnd conflict resolution
    const merged = cn('p-4', 'p-2');
    expect(merged).toBe('p-2');
  });

  it('slugify() formats titles into url-safe slugs', () => {
    expect(slugify('Build Together Web App')).toBe('build-together-web-app');
    expect(slugify('AI & Machine Learning: Prototyping!')).toBe('ai-machine-learning-prototyping');
    expect(slugify('  Trim Spaces  ')).toBe('trim-spaces');
  });
});
