import { describe, it, expect } from 'vitest';
import {
  stepTypeEnum,
  intervalStepEntitySchema,
  intervalDetailsEntitySchema,
  weatherDataSchema,
  stravaActivityStoredSchema,
  stravaStreamSchema,
  trainingSessionEntitySchema,
} from '@/lib/validation/schemas/entities';

describe('Entity Schemas', () => {
  describe('stepTypeEnum', () => {
    it('accepts valid step types', () => {
      expect(stepTypeEnum.parse('warmup')).toBe('warmup');
      expect(stepTypeEnum.parse('effort')).toBe('effort');
      expect(stepTypeEnum.parse('recovery')).toBe('recovery');
      expect(stepTypeEnum.parse('cooldown')).toBe('cooldown');
    });

    it('rejects invalid step types', () => {
      expect(() => stepTypeEnum.parse('invalid')).toThrow();
    });
  });

  describe('intervalStepEntitySchema', () => {
    it('validates a complete interval step', () => {
      const step = {
        stepNumber: 1,
        stepType: 'effort',
        duration: '01:00',
        distance: 0.22,
        pace: '4:30',
        hr: 180,
      };
      const result = intervalStepEntitySchema.safeParse(step);
      expect(result.success).toBe(true);
    });

    it('allows null values for optional fields', () => {
      const step = {
        stepNumber: 1,
        stepType: 'warmup',
        duration: null,
        distance: null,
        pace: null,
        hr: null,
      };
      const result = intervalStepEntitySchema.safeParse(step);
      expect(result.success).toBe(true);
    });

    it('rejects invalid step number', () => {
      const step = {
        stepNumber: 0,
        stepType: 'effort',
        duration: null,
        distance: null,
        pace: null,
        hr: null,
      };
      const result = intervalStepEntitySchema.safeParse(step);
      expect(result.success).toBe(false);
    });
  });

  describe('intervalDetailsEntitySchema', () => {
    it('validates complete interval details', () => {
      const details = {
        workoutType: 'VMA',
        repetitionCount: 8,
        effortDuration: '01:00',
        recoveryDuration: '01:00',
        effortDistance: 0.22,
        recoveryDistance: 0.13,
        targetEffortPace: '4:30',
        targetEffortHR: 180,
        targetRecoveryPace: '7:30',
        steps: [
          { stepNumber: 1, stepType: 'warmup', duration: '15:00', distance: 2.2, pace: '6:45', hr: 140 },
          { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: 0.22, pace: '4:30', hr: 180 },
        ],
      };
      const result = intervalDetailsEntitySchema.safeParse(details);
      expect(result.success).toBe(true);
    });

    it('allows null values', () => {
      const details = {
        workoutType: null,
        repetitionCount: null,
        effortDuration: null,
        recoveryDuration: null,
        effortDistance: null,
        recoveryDistance: null,
        targetEffortPace: null,
        targetEffortHR: null,
        targetRecoveryPace: null,
        steps: [],
      };
      const result = intervalDetailsEntitySchema.safeParse(details);
      expect(result.success).toBe(true);
    });
  });

  describe('weatherDataSchema', () => {
    it('validates weather data', () => {
      const weather = {
        conditionCode: 800,
        temperature: 18,
        windSpeed: 5,
        precipitation: 0,
        timestamp: 1704535200,
      };
      const result = weatherDataSchema.safeParse(weather);
      expect(result.success).toBe(true);
    });

    it('allows optional timestamp', () => {
      const weather = {
        conditionCode: 800,
        temperature: 18,
        windSpeed: 5,
        precipitation: 0,
      };
      const result = weatherDataSchema.safeParse(weather);
      expect(result.success).toBe(true);
    });
  });

  describe('stravaActivityStoredSchema', () => {
    it('validates minimal Strava activity', () => {
      const activity = {
        id: 123456,
        name: 'Morning Run',
        distance: 10000,
        moving_time: 3600,
        elapsed_time: 3700,
        total_elevation_gain: 50,
        type: 'Run',
        start_date: '2024-01-15T07:00:00Z',
        start_date_local: '2024-01-15T08:00:00',
        average_speed: 2.78,
        max_speed: 3.5,
      };
      const result = stravaActivityStoredSchema.safeParse(activity);
      expect(result.success).toBe(true);
    });

    it('validates Strava activity with all optional fields', () => {
      const activity = {
        id: 123456,
        name: 'Morning Run',
        distance: 10000,
        moving_time: 3600,
        elapsed_time: 3700,
        total_elevation_gain: 50,
        type: 'Run',
        start_date: '2024-01-15T07:00:00Z',
        start_date_local: '2024-01-15T08:00:00',
        average_speed: 2.78,
        max_speed: 3.5,
        average_heartrate: 145,
        max_heartrate: 175,
        average_cadence: 85,
        average_temp: 18,
        elev_high: 120,
        elev_low: 80,
        calories: 650,
        map: {
          id: 'map123',
          summary_polyline: 'abc123',
        },
        external_id: 'ext123',
        upload_id: 789,
      };
      const result = stravaActivityStoredSchema.safeParse(activity);
      expect(result.success).toBe(true);
    });
  });

  describe('stravaStreamSchema', () => {
    it('validates Strava stream', () => {
      const stream = {
        data: [0, 10, 20, 30],
        series_type: 'time',
        original_size: 4,
        resolution: 'high',
      };
      const result = stravaStreamSchema.safeParse(stream);
      expect(result.success).toBe(true);
    });

    it('rejects empty data array', () => {
      const stream = {
        data: [],
        series_type: 'time',
        original_size: 0,
        resolution: 'high',
      };
      const result = stravaStreamSchema.safeParse(stream);
      expect(result.success).toBe(false);
    });
  });

  describe('trainingSessionEntitySchema', () => {
    it('validates a completed session', () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        sessionNumber: 1,
        week: 1,
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '1:00:00',
        distance: 10,
        avgPace: '6:00',
        avgHeartRate: 145,
        perceivedExertion: 5,
        comments: 'Good session',
        status: 'completed',
      };
      const result = trainingSessionEntitySchema.safeParse(session);
      expect(result.success).toBe(true);
    });

    it('validates a planned session', () => {
      const session = {
        id: 'session-2',
        userId: 'user-1',
        sessionNumber: 2,
        week: null,
        date: null,
        sessionType: 'Fractionné',
        duration: null,
        distance: null,
        avgPace: null,
        avgHeartRate: null,
        comments: '',
        status: 'planned',
        plannedDate: '2024-01-20',
        targetDuration: 45,
        targetDistance: 8,
        targetPace: '5:30',
        targetRPE: 7,
      };
      const result = trainingSessionEntitySchema.safeParse(session);
      expect(result.success).toBe(true);
    });

    it('validates session with interval details', () => {
      const session = {
        id: 'session-3',
        userId: 'user-1',
        sessionNumber: 3,
        week: 1,
        date: '2024-01-17',
        sessionType: 'Fractionné',
        duration: '0:45:00',
        distance: 8,
        avgPace: '5:37',
        avgHeartRate: 165,
        comments: 'VMA session',
        status: 'completed',
        intervalDetails: {
          workoutType: 'VMA',
          repetitionCount: 8,
          effortDuration: '01:00',
          recoveryDuration: '01:00',
          effortDistance: 0.22,
          recoveryDistance: 0.13,
          targetEffortPace: '4:30',
          targetEffortHR: 180,
          targetRecoveryPace: '7:30',
          steps: [],
        },
      };
      const result = trainingSessionEntitySchema.safeParse(session);
      expect(result.success).toBe(true);
    });

    it('validates session with Strava data', () => {
      const session = {
        id: 'session-4',
        userId: 'user-1',
        sessionNumber: 4,
        week: 1,
        date: '2024-01-18',
        sessionType: 'Footing',
        duration: '0:50:00',
        distance: 9,
        avgPace: '5:33',
        avgHeartRate: 140,
        comments: '',
        status: 'completed',
        externalId: 'strava-123',
        source: 'strava',
        stravaData: {
          id: 123456,
          name: 'Morning Run',
          distance: 9000,
          moving_time: 3000,
          elapsed_time: 3100,
          total_elevation_gain: 30,
          type: 'Run',
          start_date: '2024-01-18T07:00:00Z',
          start_date_local: '2024-01-18T08:00:00',
          average_speed: 3.0,
          max_speed: 4.0,
        },
      };
      const result = trainingSessionEntitySchema.safeParse(session);
      expect(result.success).toBe(true);
    });
  });
});
