import { describe, it, expect } from 'vitest';
import {
  requiredDurationSchema,
  optionalDurationSchema,
  nullableDurationSchema,
  requiredPaceSchema,
  optionalPaceSchema,
  nullablePaceSchema,
  heartRateSchema,
  nullableHeartRateSchema,
  optionalHeartRateSchema,
  rpeSchema,
  optionalRpeSchema,
  nullablePositiveNumberSchema,
  isValidNullableNumber,
} from '@/lib/validation/schemas/primitives';

describe('Primitive Validation Schemas', () => {
  describe('Duration Schemas', () => {
    describe('requiredDurationSchema', () => {
      it('accepts valid duration formats', () => {
        const validFormats = ['1:30:00', '0:45:30', '12:00', '5:30'];
        validFormats.forEach((duration) => {
          const result = requiredDurationSchema.safeParse(duration);
          expect(result.success, `Expected ${duration} to be valid`).toBe(true);
        });
      });

      it('rejects empty string', () => {
        const result = requiredDurationSchema.safeParse('');
        expect(result.success).toBe(false);
      });

      it('rejects invalid formats', () => {
        const invalidFormats = ['abc', '1:2:3:4', 'invalid'];
        invalidFormats.forEach((duration) => {
          const result = requiredDurationSchema.safeParse(duration);
          expect(result.success, `Expected ${duration} to be invalid`).toBe(false);
        });
      });
    });

    describe('optionalDurationSchema', () => {
      it('accepts undefined', () => {
        const result = optionalDurationSchema.safeParse(undefined);
        expect(result.success).toBe(true);
      });

      it('accepts empty string', () => {
        const result = optionalDurationSchema.safeParse('');
        expect(result.success).toBe(true);
      });

      it('accepts valid duration', () => {
        const result = optionalDurationSchema.safeParse('1:30:00');
        expect(result.success).toBe(true);
      });
    });

    describe('nullableDurationSchema', () => {
      it('accepts null', () => {
        const result = nullableDurationSchema.safeParse(null);
        expect(result.success).toBe(true);
      });

      it('accepts valid duration', () => {
        const result = nullableDurationSchema.safeParse('0:45:30');
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Pace Schemas', () => {
    describe('requiredPaceSchema', () => {
      it('accepts valid pace formats', () => {
        const validFormats = ['5:30', '6:00', '4:45', '12:00'];
        validFormats.forEach((pace) => {
          const result = requiredPaceSchema.safeParse(pace);
          expect(result.success, `Expected ${pace} to be valid`).toBe(true);
        });
      });

      it('rejects empty string', () => {
        const result = requiredPaceSchema.safeParse('');
        expect(result.success).toBe(false);
      });
    });

    describe('optionalPaceSchema', () => {
      it('accepts undefined', () => {
        const result = optionalPaceSchema.safeParse(undefined);
        expect(result.success).toBe(true);
      });

      it('accepts empty string', () => {
        const result = optionalPaceSchema.safeParse('');
        expect(result.success).toBe(true);
      });
    });

    describe('nullablePaceSchema', () => {
      it('accepts null', () => {
        const result = nullablePaceSchema.safeParse(null);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Heart Rate Schemas', () => {
    describe('heartRateSchema', () => {
      it('accepts valid heart rate', () => {
        const result = heartRateSchema.safeParse(145);
        expect(result.success).toBe(true);
      });

      it('rejects negative heart rate', () => {
        const result = heartRateSchema.safeParse(-10);
        expect(result.success).toBe(false);
      });

      it('rejects heart rate above max (250)', () => {
        const result = heartRateSchema.safeParse(300);
        expect(result.success).toBe(false);
      });

      it('accepts boundary values', () => {
        expect(heartRateSchema.safeParse(0).success).toBe(true);
        expect(heartRateSchema.safeParse(250).success).toBe(true);
      });
    });

    describe('nullableHeartRateSchema', () => {
      it('accepts null', () => {
        const result = nullableHeartRateSchema.safeParse(null);
        expect(result.success).toBe(true);
      });

      it('validates when present', () => {
        expect(nullableHeartRateSchema.safeParse(145).success).toBe(true);
        expect(nullableHeartRateSchema.safeParse(300).success).toBe(false);
      });
    });

    describe('optionalHeartRateSchema', () => {
      it('accepts undefined', () => {
        const result = optionalHeartRateSchema.safeParse(undefined);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('RPE Schemas', () => {
    describe('rpeSchema', () => {
      it('accepts valid RPE values (0-10)', () => {
        [0, 5, 10].forEach((rpe) => {
          const result = rpeSchema.safeParse(rpe);
          expect(result.success, `Expected ${rpe} to be valid`).toBe(true);
        });
      });

      it('rejects negative values', () => {
        const result = rpeSchema.safeParse(-1);
        expect(result.success).toBe(false);
      });

      it('rejects values above 10', () => {
        const result = rpeSchema.safeParse(11);
        expect(result.success).toBe(false);
      });
    });

    describe('optionalRpeSchema', () => {
      it('accepts undefined', () => {
        const result = optionalRpeSchema.safeParse(undefined);
        expect(result.success).toBe(true);
      });

      it('accepts null', () => {
        const result = optionalRpeSchema.safeParse(null);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Number Helpers', () => {
    describe('isValidNullableNumber', () => {
      it('returns true for null', () => {
        expect(isValidNullableNumber(null)).toBe(true);
      });

      it('returns true for undefined', () => {
        expect(isValidNullableNumber(undefined)).toBe(true);
      });

      it('returns true for valid numbers', () => {
        expect(isValidNullableNumber(42)).toBe(true);
        expect(isValidNullableNumber(0)).toBe(true);
        expect(isValidNullableNumber(-5)).toBe(true);
      });

      it('returns false for NaN', () => {
        expect(isValidNullableNumber(NaN)).toBe(false);
      });

      it('returns false for non-numbers', () => {
        expect(isValidNullableNumber('42')).toBe(false);
      });
    });

    describe('nullablePositiveNumberSchema', () => {
      it('accepts null', () => {
        const result = nullablePositiveNumberSchema.safeParse(null);
        expect(result.success).toBe(true);
      });

      it('accepts positive numbers', () => {
        const result = nullablePositiveNumberSchema.safeParse(10);
        expect(result.success).toBe(true);
      });

      it('accepts zero', () => {
        const result = nullablePositiveNumberSchema.safeParse(0);
        expect(result.success).toBe(true);
      });

      it('rejects negative numbers', () => {
        const result = nullablePositiveNumberSchema.safeParse(-5);
        expect(result.success).toBe(false);
      });
    });
  });
});
