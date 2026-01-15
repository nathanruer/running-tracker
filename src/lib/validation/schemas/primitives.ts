import { z } from 'zod';
import { validateDurationInput } from '@/lib/utils/duration';
import { validatePaceInput } from '@/lib/utils/pace';
import { HEART_RATE, RPE } from '@/lib/constants/validation';
import { VALIDATION_MESSAGES } from '@/lib/constants/messages';

// ============================================================================
// DURATION SCHEMAS
// ============================================================================

/**
 * Required duration (cannot be empty)
 */
export const requiredDurationSchema = z
  .string()
  .min(1, VALIDATION_MESSAGES.DURATION_REQUIRED)
  .refine((val) => validateDurationInput(val), {
    message: VALIDATION_MESSAGES.DURATION_FORMAT,
  });

/**
 * Optional duration (can be undefined or empty string)
 */
export const optionalDurationSchema = z
  .string()
  .optional()
  .refine((val) => !val || val === '' || validateDurationInput(val), {
    message: VALIDATION_MESSAGES.DURATION_FORMAT,
  });

/**
 * Nullable duration (can be null or empty string)
 */
export const nullableDurationSchema = z
  .string()
  .nullable()
  .refine((val) => val === null || val === '' || validateDurationInput(val), {
    message: VALIDATION_MESSAGES.DURATION_FORMAT,
  });

// ============================================================================
// PACE SCHEMAS
// ============================================================================

/**
 * Required pace (cannot be empty)
 */
export const requiredPaceSchema = z
  .string()
  .min(1, VALIDATION_MESSAGES.PACE_REQUIRED)
  .refine((val) => validatePaceInput(val), {
    message: VALIDATION_MESSAGES.PACE_FORMAT,
  });

/**
 * Optional pace (can be undefined or empty string)
 */
export const optionalPaceSchema = z
  .string()
  .optional()
  .refine((val) => !val || val === '' || validatePaceInput(val), {
    message: VALIDATION_MESSAGES.PACE_FORMAT,
  });

/**
 * Nullable pace (can be null or empty string)
 */
export const nullablePaceSchema = z
  .string()
  .nullable()
  .refine((val) => val === null || val === '' || validatePaceInput(val), {
    message: VALIDATION_MESSAGES.PACE_FORMAT,
  });

// ============================================================================
// HEART RATE SCHEMAS
// ============================================================================

/**
 * Heart rate with min/max validation
 */
export const heartRateSchema = z
  .number()
  .min(HEART_RATE.MIN, { message: VALIDATION_MESSAGES.HR_POSITIVE })
  .max(HEART_RATE.MAX, { message: VALIDATION_MESSAGES.HR_MAX });

/**
 * Nullable heart rate
 */
export const nullableHeartRateSchema = heartRateSchema.nullable();

/**
 * Optional nullable heart rate
 */
export const optionalHeartRateSchema = heartRateSchema.optional().nullable();

// ============================================================================
// RPE (Rate of Perceived Exertion) SCHEMAS
// ============================================================================

/**
 * RPE with min/max validation (0-10 scale)
 */
export const rpeSchema = z
  .number()
  .min(RPE.MIN, { message: VALIDATION_MESSAGES.RPE_POSITIVE })
  .max(RPE.MAX, { message: VALIDATION_MESSAGES.RPE_MAX });

/**
 * Optional nullable RPE
 */
export const optionalRpeSchema = rpeSchema.optional().nullable();

// ============================================================================
// NUMBER HELPERS
// ============================================================================

/**
 * Nullable number refinement utility
 */
export const isValidNullableNumber = (n: unknown): boolean =>
  n === null || n === undefined || (typeof n === 'number' && !isNaN(n));

/**
 * Nullable positive number
 */
export const nullablePositiveNumberSchema = z
  .number()
  .min(0, { message: VALIDATION_MESSAGES.DISTANCE_POSITIVE })
  .nullable();

/**
 * Optional nullable number with custom refinement
 */
export const optionalNullableNumberSchema = z
  .number()
  .nullable()
  .optional()
  .refine(isValidNullableNumber, { message: VALIDATION_MESSAGES.NUMBER_REQUIRED });
