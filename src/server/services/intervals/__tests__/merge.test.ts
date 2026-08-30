import { describe, it, expect } from 'vitest';
import { mergeIntervalsActivities, type MergePart } from '../merge';
import type { IntervalsActivity, IntervalsInterval, IntervalsStream } from '../client';

const warmUp: IntervalsActivity = {
  id: 'i181258108',
  start_date: '2026-08-30T09:15:43Z',
  start_date_local: '2026-08-30T11:15:43',
  type: 'Run',
  name: 'Échauffement',
  moving_time: 454,
  elapsed_time: 487,
  distance: 1150.25,
  average_heartrate: 134,
  max_heartrate: 147,
  average_cadence: 75,
  total_elevation_gain: 34.4,
  calories: 90,
};

const workout: IntervalsActivity = {
  id: 'i181266970',
  start_date: '2026-08-30T09:26:12Z',
  start_date_local: '2026-08-30T11:26:12',
  type: 'Run',
  name: 'Paris Course à pied',
  moving_time: 1324,
  elapsed_time: 1331,
  distance: 4150,
  average_heartrate: 167,
  max_heartrate: 179,
  average_cadence: 81,
  total_elevation_gain: 42,
  calories: 320,
};

const workoutIntervals: IntervalsInterval[] = [
  { type: 'WORK', moving_time: 16, distance: 37.08, average_heartrate: 137 },
  { type: 'WORK', moving_time: 604, distance: 1847.49, average_heartrate: 162 },
  { type: 'RECOVERY', moving_time: 116, distance: 318.13, average_heartrate: 161 },
  { type: 'WORK', moving_time: 595, distance: 1944.62, average_heartrate: 174 },
];

const streams = (time: number[], distance: number[], heartrate: number[]): IntervalsStream[] => [
  { type: 'time', data: time },
  { type: 'distance', data: distance },
  { type: 'heartrate', data: heartrate },
];

const parts: MergePart[] = [
  {
    activity: workout,
    streams: streams([0, 10, 20], [0, 40, 80], [150, 160, 170]),
    latlngs: [[48.86, 2.35], [48.861, 2.351]],
    intervals: workoutIntervals,
  },
  {
    activity: warmUp,
    streams: streams([0, 10, 20], [0, 30, 60], [120, 125, 130]),
    latlngs: [[48.857, 2.34], [48.858, 2.341]],
    intervals: [{ type: 'WORK', moving_time: 454, distance: 1150.25, average_heartrate: 134 }],
  },
];

describe('mergeIntervalsActivities', () => {
  it('rebuilds one session out of the warm-up and the workout', () => {
    const merged = mergeIntervalsActivities(parts);

    expect(merged.startedAt).toBe('2026-08-30T09:15:43Z');
    expect(merged.date).toBe('2026-08-30T11:15:43');
    expect(merged.duration).toBe('29:38');
    expect(merged.distance).toBe(5.3);
    expect(merged.avgPace).toBe('05:35');
    expect(merged.avgHeartRate).toBe(159);
    expect(merged.maxHeartRate).toBe(179);
    expect(merged.elevationGain).toBeCloseTo(76.4, 1);
    expect(merged.calories).toBe(410);
    expect(merged.comments).toBe('Paris Course à pied');
    expect(merged.externalId).toBe('i181266970');
  });

  it('reads the separate recording as the warm-up of the interval session', () => {
    const merged = mergeIntervalsActivities(parts);

    expect(merged.sessionType).toBe('Fractionné');
    expect(merged.intervalDetails).toMatchObject({
      workoutType: 'TEMPO',
      repetitionCount: 2,
      effortDuration: '10:00',
      recoveryDuration: '02:00',
    });
    expect(merged.intervalDetails?.steps.map((step) => step.stepType)).toEqual([
      'warmup', 'effort', 'recovery', 'effort',
    ]);
    expect(merged.intervalDetails?.steps[0]).toMatchObject({ duration: '07:34', distance: 1.15 });
  });

  it('keeps both recordings as sources and glues their series end to end', () => {
    const merged = mergeIntervalsActivities(parts);

    expect(merged.sources.map((source) => source.externalId)).toEqual(['i181258108', 'i181266970']);
    expect(merged.sources[0].sourcePayload).toBe(warmUp);
    expect(merged.streams?.time.data).toEqual([0, 10, 20, 21, 31, 41]);
    expect(merged.streams?.distance.data).toEqual([0, 30, 60, 60, 100, 140]);
    expect(merged.streams?.heartrate.data).toEqual([120, 125, 130, 150, 160, 170]);
    expect(merged.routePolyline).toBeTruthy();
  });

  it('proposes a plain run when no recording holds intervals', () => {
    const merged = mergeIntervalsActivities([
      { ...parts[1] },
      {
        activity: { ...warmUp, id: 'i2', start_date: '2026-08-30T09:25:00Z', start_date_local: '2026-08-30T11:25:00' },
        streams: [],
        latlngs: [],
        intervals: [{ type: 'WORK', moving_time: 900, distance: 2800, average_heartrate: 140 }],
      },
    ]);

    expect(merged.sessionType).toBe('Footing');
    expect(merged.intervalDetails).toBeNull();
  });
});
