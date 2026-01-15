import { describe, it, expect } from 'vitest';
import { formatNumber } from '../index';

describe('formatNumber', () => {
  it('should format numbers with French thousand separators', () => {
    expect(formatNumber(1234)).toBe('1\u202f234');
    expect(formatNumber(1234567)).toBe('1\u202f234\u202f567');
  });

  it('should format numbers with specified decimals', () => {
    expect(formatNumber(1234.56, 2)).toBe('1\u202f234,56');
    expect(formatNumber(1234.567, 1)).toBe('1\u202f234,6');
    expect(formatNumber(1234, 2)).toBe('1\u202f234,00');
  });

  it('should default to 0 decimals', () => {
    expect(formatNumber(1234.56)).toBe('1\u202f235');
    expect(formatNumber(1234.4)).toBe('1\u202f234');
  });
});
