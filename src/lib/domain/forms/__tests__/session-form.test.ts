import { describe, it, expect } from 'vitest';
import {
  initializeFormForCreate,
  initializeFormForEdit,
  initializeFormForComplete,
  intervalDetailsToFormFields,
  intervalsProvenance,
} from '../session-form';
import type { TrainingSession } from '@/lib/types';

describe('initializeFormForCreate', () => {
  it('returns default values without initialData', () => {
    const result = initializeFormForCreate();

    expect(result.sessionType).toBe('Footing');
    expect(result.duration).toBe('');
    expect(result.distance).toBeNull();
    expect(result.avgPace).toBe('');
    expect(result.avgHeartRate).toBeNull();
    expect(result.perceivedExertion).toBeNull();
    expect(result.comments).toBe('');
    expect(result.source).toBe('manual');
    expect(result.sourcePayload).toBeNull();
  });

  it('pre-fills with initialData if provided', () => {
    const initialData = {
      sessionType: 'Fractionné',
      duration: '45:00',
      distance: 10,
      avgPace: '04:30',
      comments: 'Données importées',
    };

    const result = initializeFormForCreate(initialData);

    expect(result.sessionType).toBe('Fractionné');
    expect(result.duration).toBe('45:00');
    expect(result.distance).toBe(10);
    expect(result.avgPace).toBe('04:30');
    expect(result.comments).toBe('Données importées');
  });

  it('uses provided date or today', () => {
    const withDate = initializeFormForCreate({ date: '2024-01-15' });
    expect(withDate.date).toBe('2024-01-15');

    const withoutDate = initializeFormForCreate();
    // Should be today's date in ISO format (YYYY-MM-DD)
    expect(withoutDate.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('initializeFormForEdit', () => {
  it('initializes for editing a planned session with plannedDate', () => {
    const session = {
      status: 'planned',
      date: null,
      plannedDate: '2024-01-15T00:00:00.000Z',
      sessionType: 'Footing',
      targetDuration: 45,
      targetDistance: 10,
      targetPace: '04:30',
      targetHeartRateBpm: 150,
      targetRPE: 5,
      comments: 'Session planifiée',
      externalId: null,
      source: 'manual',
    } as TrainingSession;

    const result = initializeFormForEdit(session);

    expect(result.date).toBe('2024-01-15');
    expect(result.sessionType).toBe('Footing');
    expect(result.duration).toBe('00:45:00');
    expect(result.distance).toBe(10);
    expect(result.avgPace).toBe('04:30');
    expect(result.avgHeartRate).toBe(150);
    expect(result.perceivedExertion).toBe(5);
    expect(result.comments).toBe('Session planifiée');
  });

  it('initializes with empty date when planned session has no date', () => {
    const session = {
      status: 'planned',
      date: null,
      plannedDate: null,
      sessionType: 'Footing',
      targetDuration: 45,
      comments: '',
    } as TrainingSession;

    const result = initializeFormForEdit(session);

    expect(result.date).toBe('');
  });

  it('initializes for editing a completed session', () => {
    const session = {
      status: 'completed',
      date: '2024-01-15',
      sessionType: 'Footing',
      duration: '00:45:00',
      distance: 10,
      avgPace: '04:30',
      avgHeartRate: 150,
      perceivedExertion: 5,
      comments: 'Session complétée',
      streams: null,
    } as TrainingSession;

    const result = initializeFormForEdit(session);

    expect(result.duration).toBe('00:45:00');
    expect(result.distance).toBe(10);
    expect(result.avgPace).toBe('04:30');
    expect(result.avgHeartRate).toBe(150);
    expect(result.perceivedExertion).toBe(5);
  });

  it('handles null and undefined values', () => {
    const session = {
      status: 'completed',
      date: '2024-01-15',
      sessionType: 'Footing',
      duration: null,
      distance: 0,
      avgPace: null,
      avgHeartRate: 0,
      perceivedExertion: null,
      comments: null,
    } as unknown as TrainingSession;

    const result = initializeFormForEdit(session);

    expect(result.duration).toBe('00:00:00');
    expect(result.distance).toBe(0);
    expect(result.avgPace).toBe('00:00');
    expect(result.avgHeartRate).toBe(0);
    expect(result.perceivedExertion).toBeNull();
  });

  it('correctly transforms interval data', () => {
    const session = {
      status: 'completed',
      date: '2024-01-15',
      sessionType: 'Fractionné',
      intervalDetails: {
        workoutType: '8x400m',
        repetitionCount: 8,
        effortDuration: '00:02:00',
        recoveryDuration: '00:01:30',
        steps: [
          {
            stepNumber: 1,
            stepType: 'warmup' as const,
            duration: '00:10:00',
            distance: 2,
            pace: null,
            hr: null,
          },
        ],
      },
    } as unknown as TrainingSession;

    const result = initializeFormForEdit(session);

    expect(result.workoutType).toBe('8x400m');
    expect(result.repetitionCount).toBe(8);
    expect(result.effortDuration).toBe('00:02:00');
    expect(result.recoveryDuration).toBe('00:01:30');
    expect(result.steps).toHaveLength(1);
    expect(result.steps?.[0].stepType).toBe('warmup');
  });
});

describe('initializeFormForComplete', () => {
  it('merges planned session with imported data', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Footing',
      targetDuration: 45,
      targetRPE: 5,
      comments: 'Session planifiée',
      source: 'manual',
    } as TrainingSession;

    const initialData = {
      duration: '48:30',
      distance: 10.5,
      avgPace: '04:37',
      avgHeartRate: 155,
    };

    const result = initializeFormForComplete(session, initialData);

    expect(result.sessionType).toBe('Footing');
    expect(result.duration).toBe('48:30'); // initialData takes priority
    expect(result.distance).toBe(10.5);
    expect(result.avgPace).toBe('04:37');
    expect(result.avgHeartRate).toBe(155);
    expect(result.perceivedExertion).toBe(5); // From session.targetRPE
    expect(result.comments).toBe('Session planifiée');
  });

  it('uses default values if no imported data', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Footing',
      targetDuration: 45,
      comments: 'Session planifiée',
    } as TrainingSession;

    const result = initializeFormForComplete(session, null);

    expect(result.duration).toBe('');
    expect(result.distance).toBeNull();
    expect(result.avgPace).toBe('');
    expect(result.avgHeartRate).toBeNull();
  });

  it('pre-fills imported activity data from initialData', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Footing',
      source: 'manual',
      streams: null,
      elevationGain: null,
    } as TrainingSession;

    const initialData = {
      source: 'intervals_icu',
      sourcePayload: { id: 12345 },
      routePolyline: 'abc',
      elevationGain: 150,
    };

    const result = initializeFormForComplete(session, initialData);

    expect(result.source).toBe('intervals_icu');
    expect(result.sourcePayload).toEqual(initialData.sourcePayload);
    expect(result.elevationGain).toBe(150);
  });

  it('fills the form with the intervals actually run, not the planned ones', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Fractionné',
      intervalDetails: {
        workoutType: 'VMA',
        repetitionCount: 8,
        effortDuration: '00:01:00',
        effortDistance: 0.4,
        steps: [
          { stepNumber: 1, stepType: 'effort' as const, duration: '00:01:00', distance: 0.4, pace: null, hr: null },
        ],
      },
    } as unknown as TrainingSession;

    const initialData = {
      workoutType: 'TEMPO',
      repetitionCount: 2,
      effortDuration: '10:00',
      recoveryDuration: '02:00',
      steps: [
        { stepNumber: 1, stepType: 'warmup' as const, duration: '07:33', distance: 1.16, pace: '06:31', hr: 135 },
        { stepNumber: 2, stepType: 'effort' as const, duration: '10:04', distance: 1.85, pace: '05:26', hr: 162 },
      ],
    };

    const result = initializeFormForComplete(session, initialData);

    expect(result.workoutType).toBe('TEMPO');
    expect(result.repetitionCount).toBe(2);
    expect(result.effortDuration).toBe('10:00');
    // The plan's 400 m reps must not leak into a session run on duration.
    expect(result.effortDistance).toBeUndefined();
    expect(result.steps).toHaveLength(2);
    expect(result.steps?.[0]).toMatchObject({ stepType: 'warmup', duration: '07:33', hr: 135 });
  });

  it('keeps the planned intervals when the completion brings none', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Fractionné',
      intervalDetails: {
        workoutType: 'VMA',
        repetitionCount: 8,
        steps: [
          { stepNumber: 1, stepType: 'effort' as const, duration: '00:01:00', distance: 0.4, pace: null, hr: null },
        ],
      },
    } as unknown as TrainingSession;

    const result = initializeFormForComplete(session, { duration: '00:45:00' });

    expect(result.workoutType).toBe('VMA');
    expect(result.repetitionCount).toBe(8);
    expect(result.steps).toHaveLength(1);
  });

  it('uses imported steps when session has no intervals', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Footing',
    } as unknown as TrainingSession;

    const initialData = {
      steps: [
        {
          stepNumber: 1,
          stepType: 'warmup' as const,
          duration: '00:12:00',
          distance: 2.5,
          pace: '04:48',
          hr: 140,
        },
      ],
    };

    const result = initializeFormForComplete(session, initialData);

    expect(result.steps).toEqual(initialData.steps);
  });

  describe('intervalDetailsToFormFields', () => {
    it('spreads detected intervals into the flat form fields', () => {
      const fields = intervalDetailsToFormFields({
        workoutType: 'TEMPO',
        repetitionCount: 2,
        effortDuration: '10:00',
        recoveryDuration: '02:00',
        effortDistance: null,
        recoveryDistance: null,
        targetEffortPace: '05:16',
        targetEffortHR: 168,
        targetRecoveryPace: '06:05',
        steps: [{ stepNumber: 1, stepType: 'effort', duration: '10:04', distance: 1.85, pace: '05:27', hr: 162 }],
      });

      expect(fields).toEqual({
        workoutType: 'TEMPO',
        repetitionCount: 2,
        effortDuration: '10:00',
        recoveryDuration: '02:00',
        effortDistance: undefined,
        recoveryDistance: undefined,
        targetEffortPace: '05:16',
        targetEffortHR: 168,
        targetRecoveryPace: '06:05',
        steps: [{ stepNumber: 1, stepType: 'effort', duration: '10:04', distance: 1.85, pace: '05:27', hr: 162 }],
      });
    });

    it('returns nothing without intervals', () => {
      expect(intervalDetailsToFormFields(null)).toEqual({});
    });
  });

  describe('intervalsProvenance', () => {
    const imported = {
      source: 'intervals_icu',
      sessionType: 'Fractionné',
      workoutType: 'TEMPO',
      repetitionCount: 2,
      effortDuration: '10:00',
      recoveryDuration: '02:00',
      targetEffortPace: '05:16',
      targetEffortHR: 168,
      steps: [{ stepNumber: 1, stepType: 'effort' as const, duration: '10:04', distance: 1.85, pace: '05:27', hr: 162 }],
    };
    const submitted = {
      workoutType: 'TEMPO',
      repetitionCount: 2,
      effortDuration: '10:00',
      recoveryDuration: '02:00',
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: '05:16',
      targetEffortHR: 168,
      targetRecoveryPace: null,
      steps: [{ stepNumber: 1, stepType: 'effort' as const, duration: '10:04', distance: 1.85, pace: '05:27', hr: 162 }],
    };

    it('keeps the detected provenance when the athlete saves the proposal untouched', () => {
      expect(intervalsProvenance(imported, submitted)).toBe('detected');
    });

    it('ignores the duration format the form normalizes on submit', () => {
      expect(intervalsProvenance(imported, {
        ...submitted,
        effortDuration: '00:10:00',
        recoveryDuration: '00:02:00',
        steps: [{ ...submitted.steps[0], duration: '00:10:04' }],
      })).toBe('detected');
    });

    it('switches to manual as soon as a value is changed', () => {
      expect(intervalsProvenance(imported, { ...submitted, repetitionCount: 3 })).toBe('manual');
      expect(intervalsProvenance(imported, {
        ...submitted,
        steps: [{ ...submitted.steps[0], hr: 170 }],
      })).toBe('manual');
    });

    it('is manual for a session typed from scratch', () => {
      expect(intervalsProvenance({ source: 'manual', sessionType: 'Fractionné' }, submitted)).toBe('manual');
      expect(intervalsProvenance(null, submitted)).toBe('manual');
      expect(intervalsProvenance(imported, null)).toBe('manual');
    });
  });

});
