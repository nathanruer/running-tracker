import { describe, it, expect } from 'vitest';
import { 
  calculatePaceFromDurationAndDistance, 
  mpsToSecondsPerKm, 
  formatPace, 
  mpsToMinPerKm, 
  secondsToPace, 
  formatDisplayPace, 
  calculatePaceString 
} from '../format';

describe('mpsToSecondsPerKm', () => {
  it('should convert velocity to seconds per km', () => {
    expect(mpsToSecondsPerKm(4)).toBe(250); // 1000/4 = 250
    expect(mpsToSecondsPerKm(0)).toBe(0);
    expect(mpsToSecondsPerKm(-1)).toBe(0);
  });
});

describe('formatPace', () => {
  it('should format seconds per km to MM:SS', () => {
    expect(formatPace(250)).toBe('4:10');
    expect(formatPace(300)).toBe('5:00');
    expect(formatPace(0)).toBe('-');
    expect(formatPace(-1)).toBe('-');
    expect(formatPace(Infinity)).toBe('-');
  });
});

describe('mpsToMinPerKm', () => {
  it('should convert m/s to MM:SS pace', () => {
    expect(mpsToMinPerKm(4)).toBe('4:10');
  });
});

describe('secondsToPace', () => {
  it('should format total seconds to MM:SS', () => {
    expect(secondsToPace(330)).toBe('05:30');
    expect(secondsToPace(0)).toBe('-');
    expect(secondsToPace(null)).toBe('-');
  });
});

describe('formatDisplayPace', () => {
  it('should return pace or --', () => {
    expect(formatDisplayPace('05:30')).toBe('05:30');
    expect(formatDisplayPace(null)).toBe('--');
    expect(formatDisplayPace('')).toBe('--');
  });
});

describe('calculatePaceString', () => {
  it('should calculate pace string from distance and time', () => {
    expect(calculatePaceString(5000, 1500)).toBe('05:00');
    expect(calculatePaceString(0, 1500)).toBe('00:00');
  });
});

describe('calculatePaceFromDurationAndDistance', () => {
  it('should calculate correct pace (MM:SS) for valid inputs', () => {
    // 10km in 1h -> 6 min/km
    expect(calculatePaceFromDurationAndDistance('01:00:00', 10)).toBe('06:00');
    // 10km in 50min -> 5 min/km
    expect(calculatePaceFromDurationAndDistance('00:50:00', 10)).toBe('05:00');
    // 5km in 30min -> 6 min/km
    expect(calculatePaceFromDurationAndDistance('00:30:00', 5)).toBe('06:00');
  });

  it('should handle decimal distances', () => {
    // 10.5km in 1h -> 5:42.857... min/km -> rounds to 05:43
    expect(calculatePaceFromDurationAndDistance('01:00:00', 10.5)).toBe('05:43');
  });

  it('should handle short durations', () => {
     // 1km in 4 min -> 04:00
     expect(calculatePaceFromDurationAndDistance('04:00', 1)).toBe('04:00');
  });

  it('should return null for invalid inputs', () => {
    expect(calculatePaceFromDurationAndDistance('', 10)).toBeNull();
    expect(calculatePaceFromDurationAndDistance('invalid', 10)).toBeNull();
    expect(calculatePaceFromDurationAndDistance('01:00:00', 0)).toBeNull();
    expect(calculatePaceFromDurationAndDistance('01:00:00', -5)).toBeNull();
    expect(calculatePaceFromDurationAndDistance('01:00:00', null)).toBeNull();
  });

  it('should format very slow paces as HH:MM:SS (if > 60 min)', () => {
    // 0.02km in 45:06 -> ~2255:00 min/km
    // 45:06 = 2706 seconds
    // 2706 / 0.02 = 135300 seconds per km
    // 135300 + seconds = 37h 35m 00s
    expect(calculatePaceFromDurationAndDistance('00:45:06', 0.02)).toBe('37:35:00');
  });
});
