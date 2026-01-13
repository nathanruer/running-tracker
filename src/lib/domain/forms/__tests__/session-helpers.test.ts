import { describe, it, expect } from 'vitest';
import {
  normalizeFormValues,
  buildPlannedSessionPayload,
  buildCompletedSessionPayload,
  transformStepsData,
} from '../session-helpers';
import type { FormValues } from '@/lib/validation/session-form';

describe('normalizeFormValues', () => {
  it('normalise les durées au format HH:MM:SS', () => {
    const input = {
      duration: '45:30',
      effortDuration: '2:00',
      recoveryDuration: '1:30',
      steps: [{ duration: '5:00', stepNumber: 1, stepType: 'warmup' as const }],
    } as unknown as FormValues;

    const result = normalizeFormValues(input);

    expect(result.duration).toBe('00:45:30');
    expect(result.effortDuration).toBe('00:02:00');
    expect(result.recoveryDuration).toBe('00:01:30');
    expect(result.steps?.[0].duration).toBe('00:05:00');
  });

  it('gère les durées vides', () => {
    const input = {
      duration: '',
      effortDuration: '',
      recoveryDuration: '',
      steps: [],
    } as unknown as FormValues;

    const result = normalizeFormValues(input);

    expect(result.duration).toBe('');
    expect(result.effortDuration).toBe('');
    expect(result.recoveryDuration).toBe('');
  });

  it('préserve les autres champs du formulaire', () => {
    const input = {
      date: '2024-01-15',
      sessionType: 'Footing',
      duration: '45:30',
      distance: 10,
      avgPace: '04:30',
      comments: 'Test',
    } as unknown as FormValues;

    const result = normalizeFormValues(input);

    expect(result.date).toBe('2024-01-15');
    expect(result.sessionType).toBe('Footing');
    expect(result.distance).toBe(10);
    expect(result.avgPace).toBe('04:30');
    expect(result.comments).toBe('Test');
  });
});

describe('buildPlannedSessionPayload', () => {
  it('construit un payload valide pour session planifiée', () => {
    const values = {
      date: '2024-01-15',
      sessionType: 'Footing',
      duration: '45:00',
      distance: 10,
      avgPace: '04:30',
      avgHeartRate: 150,
      perceivedExertion: 5,
      comments: 'Session planifiée',
      externalId: null,
      source: 'manual',
    } as unknown as FormValues;

    const normalizedValues = {
      ...values,
      duration: '00:45:00',
    } as unknown as FormValues;

    const result = buildPlannedSessionPayload(values, normalizedValues, null, 'rec-123');

    expect(result.date).toBe('2024-01-15');
    expect(result.sessionType).toBe('Footing');
    expect(result.targetDuration).toBe(45);
    expect(result.targetDistance).toBe(10);
    expect(result.targetPace).toBe('04:30');
    expect(result.targetHeartRateBpm).toBe('150');
    expect(result.targetRPE).toBe(5);
    expect(result.comments).toBe('Session planifiée');
    expect(result.recommendationId).toBe('rec-123');
    expect(result.intervalDetails).toBeNull();
  });

  it('gère les valeurs optionnelles nulles', () => {
    const values = {
      date: '2024-01-15',
      sessionType: 'Footing',
      duration: '45:00',
      distance: null,
      avgPace: '',
      avgHeartRate: null,
      perceivedExertion: null,
      comments: '',
    } as unknown as FormValues;

    const normalizedValues = {
      ...values,
      duration: '00:45:00',
    } as unknown as FormValues;

    const result = buildPlannedSessionPayload(values, normalizedValues, null);

    expect(result.targetDistance).toBeNull();
    expect(result.targetPace).toBeNull();

    expect(result.targetHeartRateBpm).toBeNull();
    expect(result.targetRPE).toBeNull();
    expect(result.recommendationId).toBeUndefined();
  });
});

describe('buildCompletedSessionPayload', () => {
  it('construit un payload valide pour session complétée', () => {
    const values = {
      sessionType: 'Footing',
      duration: '45:00',
      distance: 10,
      avgPace: '04:30',
      avgHeartRate: 150,
      perceivedExertion: 5,
      comments: 'Bonne séance',
    } as unknown as FormValues;

    const normalizedValues = {
      ...values,
      duration: '00:45:00',
      avgPace: '04:30',
    } as unknown as FormValues;

    const result = buildCompletedSessionPayload(values, normalizedValues, null);

    expect(result.sessionType).toBe('Footing');
    expect(result.duration).toBe('00:45:00');
    expect(result.distance).toBe(10);
    expect(result.avgPace).toBe('04:30');
    expect(result.avgHeartRate).toBe(150);
    expect(result.perceivedExertion).toBe(5);
    expect(result.comments).toBe('Bonne séance');
    expect(result.intervalDetails).toBeNull();
  });

  it('gère les valeurs optionnelles', () => {
    const values = {
      sessionType: 'Footing',
      duration: '45:00',
      distance: null,
      avgPace: '',
      avgHeartRate: null,
      perceivedExertion: null,
      comments: '',
    } as unknown as FormValues;

    const normalizedValues = {
      ...values,
      duration: '00:45:00',
    } as unknown as FormValues;

    const result = buildCompletedSessionPayload(values, normalizedValues, null);

    expect(result.distance).toBeNull();
    expect(result.avgHeartRate).toBeNull();
    expect(result.perceivedExertion).toBeNull();
  });
});

describe('transformStepsData', () => {
  it('transforme les steps de la base de données', () => {
    const steps = [
      {
        stepNumber: 1,
        stepType: 'warmup' as const,
        duration: '00:10:00',
        distance: 2,
        pace: null,
        hr: null,
      },
      {
        stepNumber: 2,
        stepType: 'effort' as const,
        duration: '00:05:00',
        distance: null,
        pace: '04:00',
        hr: 160,
      },
    ];

    const result = transformStepsData(steps);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      stepNumber: 1,
      stepType: 'warmup',
      duration: '00:10:00',
      distance: 2,
      pace: null,
      hr: null,
    });
    expect(result[1]).toEqual({
      stepNumber: 2,
      stepType: 'effort',
      duration: '00:05:00',
      distance: null,
      pace: '04:00',
      hr: 160,
    });
  });

  it('retourne un tableau vide si steps undefined', () => {
    expect(transformStepsData(undefined)).toEqual([]);
  });

  it('gère les steps avec valeurs null', () => {
    const steps = [
      {
        stepNumber: 1,
        stepType: 'recovery' as const,
        duration: null,
        distance: null,
        pace: null,
        hr: null,
      },
    ];

    const result = transformStepsData(steps);

    expect(result).toHaveLength(1);
    expect(result[0].duration).toBeNull();
    expect(result[0].distance).toBeNull();
  });
});
