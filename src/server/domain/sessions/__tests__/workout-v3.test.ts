import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { buildStreamsV3, buildWorkoutV3, resolveStartedAt } from '../workout-v3';

const TZ = 'Europe/Paris';

describe('resolveStartedAt', () => {
  it('uses the provider start instant when it carries an offset', () => {
    const result = resolveStartedAt('2026-08-27T07:12:34', '2026-08-27T05:12:34Z', TZ);
    expect(result).toEqual({ startedAt: new Date('2026-08-27T05:12:34Z'), datePrecision: 'instant' });
  });

  it('ignores a provider start without offset and falls back to the wall-clock date in zone', () => {
    const result = resolveStartedAt('2026-08-27T07:12:34', '2026-08-27T07:12:34', TZ);
    expect(result).toEqual({ startedAt: new Date('2026-08-27T05:12:34Z'), datePrecision: 'instant' });
  });

  it('marks a bare day as day precision at local midnight', () => {
    const result = resolveStartedAt('2026-08-30', null, TZ);
    expect(result).toEqual({ startedAt: new Date('2026-08-29T22:00:00Z'), datePrecision: 'day' });
  });

  it('keeps an ISO instant as is', () => {
    const result = resolveStartedAt('2026-08-30T06:00:00.000Z', null, TZ);
    expect(result).toEqual({ startedAt: new Date('2026-08-30T06:00:00Z'), datePrecision: 'instant' });
  });

  it('throws on an unparseable date', () => {
    expect(() => resolveStartedAt('hier', null, TZ)).toThrow(/invalide/);
  });
});

describe('buildWorkoutV3', () => {
  it('converts form metrics to numeric columns', () => {
    const fields = buildWorkoutV3(
      { date: '2026-05-01', duration: '45:00', distance: 8.25, avgPace: '05:30', avgHeartRate: 150.4, calories: 512.6, elevationGain: 42.5 },
      null,
      TZ
    );

    expect(fields).toMatchObject({
      timezone: TZ,
      datePrecision: 'day',
      durationS: 2700,
      distanceM: 8250,
      paceSKm: 330,
      avgHr: 150,
      maxHr: null,
      calories: 513,
      elevationGainM: 42.5,
      avgCadence: null,
      routePolyline: null,
    });
  });

  it('takes max HR and polyline from the payload, falling back to the HR stream', () => {
    const withProvider = buildWorkoutV3(
      { date: '2026-05-01', startedAt: '2026-05-01T06:00:00Z', maxHeartRate: 181.2, routePolyline: 'abc' },
      { heartrate: { data: [120, 175, 160] } },
      TZ
    );
    expect(withProvider).toMatchObject({ datePrecision: 'instant', maxHr: 181, routePolyline: 'abc' });

    const fromStream = buildWorkoutV3({ date: '2026-05-01', routePolyline: '  ' }, { heartrate: { data: [120, 175, 160] } }, TZ);
    expect(fromStream).toMatchObject({ maxHr: 175, routePolyline: null });
  });
});

describe('buildStreamsV3', () => {
  it('pivots the provider stream set into columns with velocity_smooth mapped to velocity', () => {
    const result = buildStreamsV3({
      time: { data: [0, 1, 2] },
      velocity_smooth: { data: [3, 3.1, 3.2] },
      latlng: { data: [[48, 2], [48, 2], [48, 2]] },
    });

    expect(result).toEqual({
      time: [0, 1, 2],
      distance: Prisma.DbNull,
      velocity: [3, 3.1, 3.2],
      altitude: Prisma.DbNull,
      heartrate: Prisma.DbNull,
      cadence: Prisma.DbNull,
      sampleCount: 3,
    });
  });

  it('returns null when no storable series is present', () => {
    expect(buildStreamsV3({ latlng: { data: [[48, 2]] } })).toBeNull();
    expect(buildStreamsV3(null)).toBeNull();
  });
});
