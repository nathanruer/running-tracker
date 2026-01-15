import { describe, it, expect } from 'vitest';
import { capitalize } from '../index';

describe('capitalize', () => {
  it('should capitalize the first letter of a string', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
    expect(capitalize('running tracker')).toBe('Running tracker');
  });

  it('should return empty string for empty input', () => {
    expect(capitalize('')).toBe('');
    expect(capitalize(null as unknown as string)).toBe('');
  });

  it('should handle already capitalized strings', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});
