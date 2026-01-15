import { describe, it, expect } from 'vitest';
import { calculatePaceFromDurationAndDistance } from '../format';

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
