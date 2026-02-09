import { z } from 'zod';
import { DISTANCE } from '@/lib/constants/validation';
import { VALIDATION_MESSAGES } from '@/lib/constants/messages';
import {
  requiredDurationSchema,
  nullableDurationSchema,
  requiredPaceSchema,
  nullablePaceSchema,
  nullableHeartRateSchema,
  optionalHeartRateSchema,
  optionalRpeSchema,
  nullablePositiveNumberSchema,
} from './schemas/primitives';
import { stravaActivitySchema, weatherDataSchema } from './schemas/entities';

// ============================================================================
// INTERVAL STEP SCHEMA
// ============================================================================

export const intervalStepSchema = z.object({
  stepNumber: z.number().min(1, { message: VALIDATION_MESSAGES.STEP_NUMBER_REQUIRED }),
  stepType: z.enum(['warmup', 'effort', 'recovery', 'cooldown']),
  duration: nullableDurationSchema,
  distance: nullablePositiveNumberSchema,
  pace: nullablePaceSchema,
  hr: nullableHeartRateSchema,
});

// ============================================================================
// INTERVAL DETAILS SCHEMA
// ============================================================================

export const intervalDetailsSchema = z.object({
  workoutType: z.string().nullable(),
  repetitionCount: z.number().min(1, { message: VALIDATION_MESSAGES.REPETITION_MIN }).nullable(),
  effortDuration: nullableDurationSchema,
  recoveryDuration: nullableDurationSchema,
  effortDistance: nullablePositiveNumberSchema,

  targetEffortPace: nullablePaceSchema,
  targetEffortHR: nullableHeartRateSchema,
  targetRecoveryPace: nullablePaceSchema,

  steps: z.array(intervalStepSchema),
}).nullable();

// ============================================================================
// SESSION SCHEMA
// ============================================================================

export const sessionSchema = z.object({
  date: z.string(),
  sessionType: z.string().min(1, { message: VALIDATION_MESSAGES.SESSION_TYPE_REQUIRED }).nullable().optional(),
  duration: requiredDurationSchema,
  distance: z.number()
    .min(0, { message: VALIDATION_MESSAGES.DISTANCE_POSITIVE })
    .transform((val) => Math.round(val * DISTANCE.PRECISION_MULTIPLIER) / DISTANCE.PRECISION_MULTIPLIER),
  avgPace: requiredPaceSchema,
  avgHeartRate: optionalHeartRateSchema,
  intervalDetails: intervalDetailsSchema.optional(),
  perceivedExertion: optionalRpeSchema,
  comments: z.string().optional().default(''),
  externalId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  stravaData: stravaActivitySchema.optional().nullable(),
  elevationGain: z.number().optional().nullable(),
  averageCadence: z.number().optional().nullable(),
  averageTemp: z.number().optional().nullable(),
  calories: z.number().optional().nullable(),
  weather: weatherDataSchema.optional().nullable(),
});

const plannedSessionFields = z.object({
  plannedDate: z.string().nullable(),
  targetDuration: z.number().nullable(),
  targetDistance: z.number().min(0).nullable(),
  targetPace: nullablePaceSchema,
  targetHeartRateBpm: z.union([z.string(), z.number()]).nullable(),
  targetRPE: optionalRpeSchema,
  recommendationId: z.string().optional().nullable(),
});

export const partialSessionSchema = sessionSchema
  .merge(plannedSessionFields)
  .partial();

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type SessionInput = z.infer<typeof sessionSchema>;
export type IntervalDetailsInput = z.infer<typeof intervalDetailsSchema>;
export type IntervalStepInput = z.infer<typeof intervalStepSchema>;