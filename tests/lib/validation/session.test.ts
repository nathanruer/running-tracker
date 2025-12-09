import { describe, it, expect } from 'vitest';
import { sessionSchema, partialSessionSchema } from '@/lib/validation/session';

describe('Session Validation Schemas', () => {
  describe('sessionSchema', () => {
    const validSession = {
      date: '2024-01-15',
      sessionType: 'Footing',
      duration: '1:30:00',
      distance: 15.5,
      avgPace: '6:00',
      avgHeartRate: 145,
      comments: 'Bonne séance',
    };

    it('validates a correct session', () => {
      const result = sessionSchema.safeParse(validSession);
      expect(result.success).toBe(true);
    });

    it('accepts session with optional fields', () => {
      const result = sessionSchema.safeParse({
        ...validSession,
        intervalStructure: '10x400m',
        perceivedExertion: 7,
      });
      expect(result.success).toBe(true);
    });

    it('rounds distance to 2 decimal places', () => {
      const result = sessionSchema.safeParse({
        ...validSession,
        distance: 15.555,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.distance).toBe(15.56);
      }
    });

    it('rejects empty sessionType', () => {
      const result = sessionSchema.safeParse({
        ...validSession,
        sessionType: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid duration format', () => {
      const invalidFormats = ['1:30', '130:00', 'abc', '1:2:3', ''];
      invalidFormats.forEach((duration) => {
        const result = sessionSchema.safeParse({
          ...validSession,
          duration,
        });
        expect(result.success).toBe(false);
      });
    });

    it('accepts valid duration formats', () => {
      const validFormats = ['0:00:00', '1:30:00', '12:59:59', '0:05:30'];
      validFormats.forEach((duration) => {
        const result = sessionSchema.safeParse({
          ...validSession,
          duration,
        });
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid pace format', () => {
      const invalidFormats = ['6', '6:0', 'abc', '600', ''];
      invalidFormats.forEach((avgPace) => {
        const result = sessionSchema.safeParse({
          ...validSession,
          avgPace,
        });
        expect(result.success).toBe(false);
      });
    });

    it('accepts valid pace formats', () => {
      const validFormats = ['5:30', '6:00', '12:00', '0:45'];
      validFormats.forEach((avgPace) => {
        const result = sessionSchema.safeParse({
          ...validSession,
          avgPace,
        });
        expect(result.success).toBe(true);
      });
    });

    it('rejects negative distance', () => {
      const result = sessionSchema.safeParse({
        ...validSession,
        distance: -1,
      });
      expect(result.success).toBe(false);
    });

    it('accepts zero distance', () => {
      const result = sessionSchema.safeParse({
        ...validSession,
        distance: 0,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative heart rate', () => {
      const result = sessionSchema.safeParse({
        ...validSession,
        avgHeartRate: -10,
      });
      expect(result.success).toBe(false);
    });

    it('rejects perceivedExertion out of range (0-10)', () => {
      const result1 = sessionSchema.safeParse({
        ...validSession,
        perceivedExertion: -1,
      });
      expect(result1.success).toBe(false);

      const result2 = sessionSchema.safeParse({
        ...validSession,
        perceivedExertion: 11,
      });
      expect(result2.success).toBe(false);
    });

    it('accepts perceivedExertion in valid range', () => {
      [0, 5, 10].forEach((perceivedExertion) => {
        const result = sessionSchema.safeParse({
          ...validSession,
          perceivedExertion,
        });
        expect(result.success).toBe(true);
      });
    });

    it('allows null perceivedExertion', () => {
      const result = sessionSchema.safeParse({
        ...validSession,
        perceivedExertion: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('partialSessionSchema', () => {
    it('allows partial data', () => {
      const result = partialSessionSchema.safeParse({
        distance: 10,
      });
      expect(result.success).toBe(true);
    });

    it('still validates individual fields', () => {
      const result = partialSessionSchema.safeParse({
        duration: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('accepts empty object', () => {
      const result = partialSessionSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
