import { describe, it, expect } from 'vitest';
import {
  initializeFormForCreate,
  initializeFormForEdit,
  initializeFormForComplete,
} from '../session-form';
import type { TrainingSession } from '@/lib/types';

describe('initializeFormForCreate', () => {
  it('retourne les valeurs par défaut sans initialData', () => {
    const result = initializeFormForCreate();

    expect(result.sessionType).toBe('Footing');
    expect(result.duration).toBe('');
    expect(result.distance).toBeNull();
    expect(result.avgPace).toBe('');
    expect(result.avgHeartRate).toBeNull();
    expect(result.perceivedExertion).toBeNull();
    expect(result.comments).toBe('');
    expect(result.source).toBe('manual');
    expect(result.stravaData).toBeNull();
  });

  it('pré-remplit avec initialData si fourni', () => {
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

  it('utilise la date fournie ou aujourd\'hui', () => {
    const withDate = initializeFormForCreate({ date: '2024-01-15' });
    expect(withDate.date).toBe('2024-01-15');

    const withoutDate = initializeFormForCreate();
    // Should be today's date in ISO format (YYYY-MM-DD)
    expect(withoutDate.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('initializeFormForEdit', () => {
  it('initialise pour éditer une session planifiée', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Footing',
      targetDuration: 45,
      targetDistance: 10,
      targetPace: '04:30',
      targetHeartRateBpm: '150',
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

  it('initialise pour éditer une session complétée', () => {
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
      stravaData: null,
    } as TrainingSession;

    const result = initializeFormForEdit(session);

    expect(result.duration).toBe('00:45:00');
    expect(result.distance).toBe(10);
    expect(result.avgPace).toBe('04:30');
    expect(result.avgHeartRate).toBe(150);
    expect(result.perceivedExertion).toBe(5);
  });

  it('gère les valeurs null et undefined', () => {
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

  it('transforme correctement les données d\'intervalle', () => {
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
  it('fusionne session planifiée avec données importées', () => {
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
    expect(result.duration).toBe('48:30'); // Priorité initialData
    expect(result.distance).toBe(10.5);
    expect(result.avgPace).toBe('04:37');
    expect(result.avgHeartRate).toBe(155);
    expect(result.perceivedExertion).toBe(5); // From session.targetRPE
    expect(result.comments).toBe('Session planifiée');
  });

  it('utilise les valeurs par défaut si pas de données importées', () => {
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

  it('pré-remplit les données Strava depuis initialData', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Footing',
      source: 'manual',
      stravaData: null,
      elevationGain: null,
    } as TrainingSession;

    const initialData = {
      source: 'strava',
      stravaData: {
        id: 123,
        name: 'Morning Run',
        distance: 10000,
        moving_time: 2700,
        elapsed_time: 2700,
        total_elevation_gain: 150,
        type: 'Run',
        start_date: '2024-01-15T08:00:00Z',
        start_date_local: '2024-01-15T09:00:00',
        average_speed: 3.7,
        max_speed: 4.5,
      },
      elevationGain: 150,
    };

    const result = initializeFormForComplete(session, initialData);

    expect(result.source).toBe('strava');
    expect(result.stravaData).toEqual(initialData.stravaData);
    expect(result.elevationGain).toBe(150);
  });

  it('fusionne les steps d\'intervalle correctement', () => {
    const session = {
      status: 'planned',
      date: '2024-01-15',
      sessionType: 'Fractionné',
      intervalDetails: {
        workoutType: '8x400m',
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

    // initialData.steps a priorité
    expect(result.steps).toEqual(initialData.steps);
  });
});
