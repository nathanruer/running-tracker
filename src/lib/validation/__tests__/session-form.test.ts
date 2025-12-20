import { describe, it, expect } from 'vitest';
import { formSchema, intervalStepSchema } from '../session-form';

describe('session-form validation', () => {
  describe('formSchema', () => {
    it('should validate a complete valid form', () => {
      const validData = {
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
        distance: 15.5,
        avgPace: '05:30',
        avgHeartRate: 145,
        perceivedExertion: 7,
        comments: 'Great run',
      };

      const result = formSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with nullable optional fields', () => {
      const validData = {
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
        distance: null,
        avgPace: '05:30',
        avgHeartRate: null,
        perceivedExertion: null,
        comments: '',
      };

      const result = formSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with interval fields', () => {
      const validData = {
        date: '2024-01-15',
        sessionType: 'Fractionné',
        duration: '01:00:00',
        distance: 10,
        avgPace: '04:30',
        avgHeartRate: 165,
        perceivedExertion: 9,
        comments: 'VMA session',
        workoutType: 'VMA',
        repetitionCount: 8,
        effortDuration: '05:00',
        recoveryDuration: '02:00',
        effortDistance: 1.0,
        recoveryDistance: 0.4,
        targetEffortPace: '04:00',
        targetEffortHR: 170,
      };

      const result = formSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid sessionType (empty)', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: '',
        duration: '01:30:00',
        distance: 15.5,
        avgPace: '05:30',
        avgHeartRate: 145,
        perceivedExertion: 7,
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Type de séance requis');
      }
    });

    it('should reject invalid duration format', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '90:00', // Invalid: should be HH:MM:SS
        distance: 15.5,
        avgPace: '05:30',
        avgHeartRate: 145,
        perceivedExertion: 7,
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Format: HH:MM:SS');
      }
    });

    it('should accept valid duration formats', () => {
      const durations = ['0:30:00', '1:15:30', '10:05:45', '00:00:01'];

      durations.forEach(duration => {
        const data = {
          date: '2024-01-15',
          sessionType: 'Endurance',
          duration,
          distance: 10,
          avgPace: '05:30',
          avgHeartRate: 145,
          perceivedExertion: 7,
          comments: '',
        };

        const result = formSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid avgPace format', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
        distance: 15.5,
        avgPace: '5:30:00', // Invalid: should be MM:SS not HH:MM:SS
        avgHeartRate: 145,
        perceivedExertion: 7,
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Format: MM:SS');
      }
    });

    it('should accept valid avgPace formats', () => {
      const paces = ['3:45', '05:30', '10:00', '4:15'];

      paces.forEach(avgPace => {
        const data = {
          date: '2024-01-15',
          sessionType: 'Endurance',
          duration: '01:00:00',
          distance: 10,
          avgPace,
          avgHeartRate: 145,
          perceivedExertion: 7,
          comments: '',
        };

        const result = formSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject perceivedExertion out of range', () => {
      const invalidDataHigh = {
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
        distance: 15.5,
        avgPace: '05:30',
        avgHeartRate: 145,
        perceivedExertion: 11, // Max is 10
        comments: '',
      };

      const resultHigh = formSchema.safeParse(invalidDataHigh);
      expect(resultHigh.success).toBe(false);

      const invalidDataLow = {
        ...invalidDataHigh,
        perceivedExertion: -1, // Min is 0
      };

      const resultLow = formSchema.safeParse(invalidDataLow);
      expect(resultLow.success).toBe(false);
    });

    it('should accept perceivedExertion in valid range 0-10', () => {
      for (let i = 0; i <= 10; i++) {
        const data = {
          date: '2024-01-15',
          sessionType: 'Endurance',
          duration: '01:00:00',
          distance: 10,
          avgPace: '05:30',
          avgHeartRate: 145,
          perceivedExertion: i,
          comments: '',
        };

        const result = formSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should handle NaN values correctly', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
        distance: NaN,
        avgPace: '05:30',
        avgHeartRate: 145,
        perceivedExertion: 7,
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod returns "Invalid input: expected number, received NaN"
        expect(result.error.issues[0].message).toContain('NaN');
      }
    });
  });

  describe('intervalStepSchema', () => {
    it('should validate a complete interval step', () => {
      const validStep = {
        stepNumber: 1,
        stepType: 'effort',
        duration: '05:00',
        distance: 1.5,
        pace: '04:00',
        hr: 170,
      };

      const result = intervalStepSchema.safeParse(validStep);
      expect(result.success).toBe(true);
    });

    it('should validate with nullable fields', () => {
      const validStep = {
        stepNumber: 1,
        stepType: 'warmup',
        duration: null,
        distance: null,
        pace: null,
        hr: null,
      };

      const result = intervalStepSchema.safeParse(validStep);
      expect(result.success).toBe(true);
    });

    it('should validate all step types', () => {
      const stepTypes = ['warmup', 'effort', 'recovery', 'cooldown'] as const;

      stepTypes.forEach(stepType => {
        const step = {
          stepNumber: 1,
          stepType,
          duration: '10:00',
          distance: 2.0,
          pace: '05:00',
          hr: 150,
        };

        const result = intervalStepSchema.safeParse(step);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid step type', () => {
      const invalidStep = {
        stepNumber: 1,
        stepType: 'invalid',
        duration: '05:00',
        distance: 1.0,
        pace: '04:00',
        hr: 170,
      };

      const result = intervalStepSchema.safeParse(invalidStep);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidStep = {
        stepType: 'effort',
        // Missing stepNumber
        duration: '05:00',
        distance: 1.0,
        pace: '04:00',
        hr: 170,
      };

      const result = intervalStepSchema.safeParse(invalidStep);
      expect(result.success).toBe(false);
    });
  });

  describe('formSchema with steps', () => {
    it('should validate form with interval steps array', () => {
      const validData = {
        date: '2024-01-15',
        sessionType: 'Fractionné',
        duration: '01:00:00',
        distance: 10,
        avgPace: '04:30',
        avgHeartRate: 165,
        perceivedExertion: 9,
        comments: 'Interval session',
        workoutType: 'VMA',
        steps: [
          {
            stepNumber: 1,
            stepType: 'warmup',
            duration: '10:00',
            distance: null,
            pace: null,
            hr: null,
          },
          {
            stepNumber: 2,
            stepType: 'effort',
            duration: '05:00',
            distance: 1.0,
            pace: '04:00',
            hr: 170,
          },
          {
            stepNumber: 3,
            stepType: 'recovery',
            duration: '02:00',
            distance: 0.4,
            pace: '06:00',
            hr: 140,
          },
        ],
      };

      const result = formSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject form with invalid steps', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Fractionné',
        duration: '01:00:00',
        distance: 10,
        avgPace: '04:30',
        avgHeartRate: 165,
        perceivedExertion: 9,
        comments: 'Interval session',
        steps: [
          {
            stepNumber: 1,
            stepType: 'invalid_type',
            duration: '10:00',
            distance: null,
            pace: null,
            hr: null,
          },
        ],
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
