import { describe, it, expect } from 'vitest';
import { detectSessionStructure } from '../detection';
import type { IntervalsInterval } from '../client';

const lap = (
  type: 'WORK' | 'RECOVERY',
  moving_time: number,
  distance: number,
  average_heartrate?: number
): IntervalsInterval => ({ type, moving_time, distance, average_heartrate });

describe('detectSessionStructure', () => {
  it('maps a tempo session recorded by the watch (2 x 10 min) and drops the start artifact', () => {
    const detected = detectSessionStructure([
      lap('WORK', 16, 37.08, 137),
      lap('WORK', 604, 1847.49, 162),
      lap('RECOVERY', 116, 318.13, 161),
      lap('WORK', 595, 1944.62, 174),
    ]);

    expect(detected.sessionType).toBe('Fractionné');
    expect(detected.intervalDetails).toMatchObject({
      workoutType: 'TEMPO',
      repetitionCount: 2,
      effortDuration: '10:00',
      effortDistance: null,
      recoveryDuration: '02:00',
      targetEffortPace: '05:17',
      targetEffortHR: 168,
      targetRecoveryPace: '06:03',
    });
    expect(detected.intervalDetails?.steps).toEqual([
      { stepNumber: 1, stepType: 'effort', duration: '10:04', distance: 1.85, pace: '05:26', hr: 162 },
      { stepNumber: 2, stepType: 'recovery', duration: '01:56', distance: 0.32, pace: '06:03', hr: 161 },
      { stepNumber: 3, stepType: 'effort', duration: '09:55', distance: 1.94, pace: '05:07', hr: 174 },
    ]);
  });

  it('proposes a plain run when the activity holds a single effort', () => {
    const detected = detectSessionStructure([lap('WORK', 454, 1150.25, 134), lap('WORK', 3, 7.9, 149)]);

    expect(detected).toEqual({ sessionType: 'Footing', intervalDetails: null });
  });

  it('proposes a long run past 75 minutes', () => {
    expect(detectSessionStructure([lap('WORK', 5400, 17000, 142)]).sessionType).toBe('Sortie longue');
  });

  it('reads the leading and trailing recoveries as warm-up and cool-down', () => {
    const detected = detectSessionStructure([
      lap('RECOVERY', 900, 2600, 130),
      lap('WORK', 96, 400, 170),
      lap('RECOVERY', 90, 220, 150),
      lap('WORK', 94, 402, 172),
      lap('RECOVERY', 600, 1700, 128),
    ]);

    expect(detected.intervalDetails?.steps.map((step) => step.stepType)).toEqual([
      'warmup', 'effort', 'recovery', 'effort', 'cooldown',
    ]);
    expect(detected.intervalDetails).toMatchObject({
      workoutType: 'VMA',
      repetitionCount: 2,
      effortDistance: 0.4,
      effortDuration: null,
      recoveryDuration: '01:30',
    });
  });

  it('reads uneven efforts as a fartlek', () => {
    const detected = detectSessionStructure([
      lap('WORK', 60, 250, 168),
      lap('RECOVERY', 60, 180, 150),
      lap('WORK', 180, 700, 170),
      lap('RECOVERY', 60, 180, 152),
      lap('WORK', 45, 190, 172),
    ]);

    expect(detected.intervalDetails?.workoutType).toBe('FARTLEK');
  });

  it('returns nothing to propose for an activity without laps', () => {
    expect(detectSessionStructure([])).toEqual({ sessionType: null, intervalDetails: null });
  });
});
