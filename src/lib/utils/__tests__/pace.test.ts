import { describe, it, expect } from 'vitest';
import { mpsToSecondsPerKm, formatPace, mpsToMinPerKm, secondsToPace, isValidPace } from '../pace';

describe('mpsToSecondsPerKm', () => {
  it('converts m/s to seconds per km correctly', () => {
    // 10 km/h = 2.78 m/s -> 6:00 min/km = 360s
    expect(mpsToSecondsPerKm(2.77778)).toBeCloseTo(360, 0); 
    // 12 km/h = 3.33 m/s -> 5:00 min/km = 300s
    expect(mpsToSecondsPerKm(3.33333)).toBeCloseTo(300, 0);
  });

  it('handles zero or negative velocity', () => {
    expect(mpsToSecondsPerKm(0)).toBe(0);
    expect(mpsToSecondsPerKm(-5)).toBe(0);
  });
});

describe('formatPace', () => {
  it('formats pace correctly', () => {
    expect(formatPace(360)).toBe('6:00');
    expect(formatPace(330)).toBe('5:30');
    expect(formatPace(285)).toBe('4:45');
  });

  it('handles zero or infinite pace', () => {
    expect(formatPace(0)).toBe('-');
    expect(formatPace(Infinity)).toBe('-');
  });
});

describe('mpsToMinPerKm', () => {
  it('converts and formats in one step', () => {
    expect(mpsToMinPerKm(2.77778)).toBe('6:00');
    expect(mpsToMinPerKm(0)).toBe('-');
  });
});

describe('secondsToPace', () => {
  it('formats basic pace correctly with zero-padded output', () => {
    expect(secondsToPace(360)).toBe('06:00');
    expect(secondsToPace(330)).toBe('05:30');
    expect(secondsToPace(285)).toBe('04:45');
    expect(secondsToPace(65)).toBe('01:05');
  });

  it('handles fractional seconds correctly', () => {
    expect(secondsToPace(359.5)).toBe('06:00');
    expect(secondsToPace(359.4)).toBe('05:59');
    expect(secondsToPace(299.5)).toBe('05:00');
    expect(secondsToPace(299.4)).toBe('04:59');
  });

  it('handles edge cases at minute boundaries', () => {
    expect(secondsToPace(59.5)).toBe('01:00');
    expect(secondsToPace(119.5)).toBe('02:00');
    expect(secondsToPace(179.5)).toBe('03:00');
  });

  it('handles null and invalid values', () => {
    expect(secondsToPace(null)).toBe('-');
    expect(secondsToPace(0)).toBe('-');
    expect(secondsToPace(-10)).toBe('-');
    expect(secondsToPace(Infinity)).toBe('-');
    expect(secondsToPace(NaN)).toBe('-');
  });
});

describe('isValidPace', () => {
  it('validates correct pace formats', () => {
    expect(isValidPace('05:30')).toBe(true);
    expect(isValidPace('5:30')).toBe(true);
    expect(isValidPace('00:00')).toBe(true);
    expect(isValidPace('10:59')).toBe(true);
  });

  it('rejects invalid seconds (60+)', () => {
    expect(isValidPace('05:60')).toBe(false);
    expect(isValidPace('06:99')).toBe(false);
    expect(isValidPace('00:60')).toBe(false);
  });

  it('rejects invalid formats', () => {
    expect(isValidPace(null)).toBe(false);
    expect(isValidPace(undefined)).toBe(false);
    expect(isValidPace('')).toBe(false);
    expect(isValidPace('5:3')).toBe(false);
    expect(isValidPace('abc')).toBe(false);
    expect(isValidPace('5:30:00')).toBe(false);
  });
});
