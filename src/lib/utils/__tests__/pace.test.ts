import { describe, it, expect } from 'vitest';
import { mpsToSecondsPerKm, formatPace, mpsToMinPerKm } from '../pace';

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
