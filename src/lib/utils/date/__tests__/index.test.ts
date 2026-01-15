import { describe, it, expect } from 'vitest';
import { formatDate } from '../index';

describe('formatDate', () => {
  it('should format date in short format (DD/MM/YYYY)', () => {
    expect(formatDate(new Date('2024-01-15'))).toBe('15/01/2024');
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
  });

  it('should format date in long format (French)', () => {
    const result = formatDate(new Date('2024-01-15'), 'long');
    expect(result).toMatch(/15 janvier 2024/);
  });

  it('should format date in ISO format (YYYY-MM-DD)', () => {
    expect(formatDate(new Date('2024-01-15'), 'iso')).toBe('2024-01-15');
    expect(formatDate('2024-12-31', 'iso')).toBe('2024-12-31');
  });

  it('should handle Date objects and date strings', () => {
    const dateObj = new Date('2024-06-20');
    const dateStr = '2024-06-20';

    expect(formatDate(dateObj)).toBe(formatDate(dateStr));
  });
});
