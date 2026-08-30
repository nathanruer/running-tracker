import { describe, it, expect } from 'vitest';
import {
  stepTypeEnum,
  intervalStepEntitySchema,
  intervalDetailsEntitySchema,
  weatherDataSchema,
  streamSchema,
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

  describe('streamSchema', () => {
    it('validates a stream', () => {
      const stream = {
        data: [0, 10, 20, 30],
        series_type: 'time',
        original_size: 4,
        resolution: 'high',
      };
      const result = streamSchema.safeParse(stream);
      expect(result.success).toBe(true);
    });

    it('rejects empty data array', () => {
      const stream = {
        data: [],
        series_type: 'time',
        original_size: 0,
        resolution: 'high',
      };
      const result = streamSchema.safeParse(stream);
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
        hasStreams: true,
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

  });
});
