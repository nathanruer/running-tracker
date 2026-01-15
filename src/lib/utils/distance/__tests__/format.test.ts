import { describe, it, expect } from 'vitest';
import { formatDistance } from '../format';

describe('formatDistance', () => {
  it('should format distance in kilometers by default', () => {
    expect(formatDistance(5432)).toBe('5.4 km');
    expect(formatDistance(10000)).toBe('10.0 km');
    expect(formatDistance(1234)).toBe('1.2 km');
  });

  it('should format distance in meters when specified', () => {
    expect(formatDistance(543, 'm')).toBe('543 m');
    expect(formatDistance(1234, 'm')).toBe('1234 m');
  });

  it('should respect custom decimal places for km', () => {
    expect(formatDistance(5432, 'km', 0)).toBe('5 km');
    expect(formatDistance(5432, 'km', 2)).toBe('5.43 km');
    expect(formatDistance(5432, 'km', 3)).toBe('5.432 km');
  });

  it('should round meters to nearest integer', () => {
    expect(formatDistance(543.7, 'm')).toBe('544 m');
    expect(formatDistance(543.2, 'm')).toBe('543 m');
  });
});
