import { describe, it, expect } from 'vitest';
import { hasExplicitOffset, isDayOnly, zonedDayStart, zonedWallTime } from '../zoned';

describe('zoned date helpers', () => {
  it('detects day-only and offset-bearing values', () => {
    expect(isDayOnly('2026-08-30')).toBe(true);
    expect(isDayOnly('2026-08-30T07:00:00')).toBe(false);
    expect(hasExplicitOffset('2026-08-30T05:12:34Z')).toBe(true);
    expect(hasExplicitOffset('2026-08-30T07:12:34+02:00')).toBe(true);
    expect(hasExplicitOffset('2026-08-30T07:12:34')).toBe(false);
  });

  it('resolves Paris midnight in summer and winter time', () => {
    expect(zonedDayStart('2026-08-30', 'Europe/Paris').toISOString()).toBe('2026-08-29T22:00:00.000Z');
    expect(zonedDayStart('2026-01-15', 'Europe/Paris').toISOString()).toBe('2026-01-14T23:00:00.000Z');
  });

  it('resolves midnight on a DST switch day', () => {
    expect(zonedDayStart('2026-03-29', 'Europe/Paris').toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(zonedDayStart('2026-10-25', 'Europe/Paris').toISOString()).toBe('2026-10-24T22:00:00.000Z');
  });

  it('converts a bare wall-clock time to an instant in the zone', () => {
    expect(zonedWallTime('2026-08-27T07:12:34', 'Europe/Paris')?.toISOString()).toBe('2026-08-27T05:12:34.000Z');
    expect(zonedWallTime('2026-08-27 07:12', 'Europe/Paris')?.toISOString()).toBe('2026-08-27T05:12:00.000Z');
    expect(zonedWallTime('2026-08-27T05:12:34Z', 'Europe/Paris')).toBeNull();
    expect(zonedWallTime('2026-08-27', 'Europe/Paris')).toBeNull();
  });
});
