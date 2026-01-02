import { describe, it, expect } from 'vitest';
import { formSchema, intervalStepSchema } from '../session-form';

describe('session-form validation', () => {
  describe('formSchema - Required fields validation', () => {
    it('should reject empty duration with "Durée requise"', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '',
        distance: 10,
        avgPace: '05:30',
        avgHeartRate: 145,
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Durée requise');
        expect(result.error.issues[0].path).toContain('duration');
      }
    });

    it('should reject 0 distance with positive validation', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '01:00:00',
        distance: -1,
        avgPace: '05:30',
        avgHeartRate: 145,
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const distanceError = result.error.issues.find(i => i.path.includes('distance'));
        expect(distanceError).toBeDefined();
        expect(distanceError?.message).toBe('Distance doit être positive');
      }
    });

    it('should reject empty avgPace with "Allure requise"', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '01:00:00',
        distance: 10,
        avgPace: '',
        avgHeartRate: 145,
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paceError = result.error.issues.find(i => i.path.includes('avgPace'));
        expect(paceError).toBeDefined();
        expect(paceError?.message).toBe('Allure requise');
      }
    });

    it('should allow avgHeartRate to be null (optional field)', () => {
      const validData = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '01:00:00',
        distance: 10,
        avgPace: '05:30',
        avgHeartRate: null,
        comments: '',
      };

      const result = formSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('formSchema - Format validation (after required check)', () => {
    it('should show format error for invalid duration (not required error)', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: 'invalid',
        distance: 10,
        avgPace: '05:30',
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const durationError = result.error.issues.find(i => i.path.includes('duration'));
        expect(durationError?.message).toBe('Format: MM:SS ou HH:MM:SS');
      }
    });

    it('should show format error for invalid pace (not required error)', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '01:00:00',
        distance: 10,
        avgPace: 'notapace',
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paceError = result.error.issues.find(i => i.path.includes('avgPace'));
        expect(paceError?.message).toBe('Format: MM:SS');
      }
    });
  });

  describe('formSchema - Multiple duration formats support', () => {
    it('should accept MM:SS format for short durations', () => {
      const validData = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '45:30',
        distance: 10,
        avgPace: '04:33',
        comments: '',
      };

      const result = formSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept HH:MM:SS format for long durations', () => {
      const validData = {
        date: '2024-01-15',
        sessionType: 'Sortie longue',
        duration: '02:30:00',
        distance: 25,
        avgPace: '06:00',
        comments: '',
      };

      const result = formSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject duration with seconds >= 60', () => {
      const invalidData = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '45:60',
        distance: 10,
        avgPace: '05:30',
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Format: MM:SS ou HH:MM:SS');
      }
    });
  });

  describe('formSchema - Complete validation', () => {
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

    it('should validate with optional avgHeartRate as null', () => {
      const validData = {
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
        distance: 10,
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
        duration: '12:60', // Invalid: seconds >= 60
        distance: 15.5,
        avgPace: '05:30',
        avgHeartRate: 145,
        perceivedExertion: 7,
        comments: '',
      };

      const result = formSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Format: MM:SS ou HH:MM:SS');
      }
    });

    it('should accept valid duration formats', () => {
      const durations = [
        '0:30:00',
        '1:15:30',
        '10:05:45',
        '00:00:01',
        '48:30',
        '90:00',
        '5:30',
      ];

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

    it('should allow hr (FC moy) to be null or undefined (optional)', () => {
      const stepWithNullHR = {
        stepNumber: 1,
        stepType: 'effort',
        duration: '05:00',
        distance: 1.5,
        pace: '04:00',
        hr: null,
      };

      const result = intervalStepSchema.safeParse(stepWithNullHR);
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

    it('should accept MM:SS and HH:MM:SS duration formats', () => {
      const stepMMSS = {
        stepNumber: 1,
        stepType: 'effort',
        duration: '05:30',
        distance: 1.0,
        pace: '05:30',
        hr: 160,
      };

      const resultMMSS = intervalStepSchema.safeParse(stepMMSS);
      expect(resultMMSS.success).toBe(true);

      const stepHHMMSS = {
        stepNumber: 1,
        stepType: 'warmup',
        duration: '00:10:00',
        distance: 2.0,
        pace: '05:00',
        hr: 140,
      };

      const resultHHMMSS = intervalStepSchema.safeParse(stepHHMMSS);
      expect(resultHHMMSS.success).toBe(true);
    });

    it('should reject invalid duration format (seconds >= 60)', () => {
      const invalidStep = {
        stepNumber: 1,
        stepType: 'effort',
        duration: '14:65',
        distance: 1.0,
        pace: '04:00',
        hr: 170,
      };

      const result = intervalStepSchema.safeParse(invalidStep);
      expect(result.success).toBe(false);
      if (!result.success) {
        const durationError = result.error.issues.find(i => i.path.includes('duration'));
        expect(durationError?.message).toBe('Format: MM:SS ou HH:MM:SS');
      }
    });

    it('should reject invalid pace format', () => {
      const invalidStep = {
        stepNumber: 1,
        stepType: 'effort',
        duration: '05:00',
        distance: 1.0,
        pace: 'invalid',
        hr: 170,
      };

      const result = intervalStepSchema.safeParse(invalidStep);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paceError = result.error.issues.find(i => i.path.includes('pace'));
        expect(paceError?.message).toBe('Format: MM:SS');
      }
    });

    it('should reject pace with seconds >= 60', () => {
      const invalidStep = {
        stepNumber: 1,
        stepType: 'effort',
        duration: '05:00',
        distance: 1.0,
        pace: '04:75', // Invalid: seconds = 75
        hr: 170,
      };

      const result = intervalStepSchema.safeParse(invalidStep);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paceError = result.error.issues.find(i => i.path.includes('pace'));
        expect(paceError?.message).toBe('Format: MM:SS');
      }
    });

    it('should accept empty string for optional duration and pace', () => {
      const stepWithEmptyStrings = {
        stepNumber: 1,
        stepType: 'warmup',
        duration: '',
        distance: null,
        pace: '',
        hr: null,
      };

      const result = intervalStepSchema.safeParse(stepWithEmptyStrings);
      expect(result.success).toBe(true);
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
