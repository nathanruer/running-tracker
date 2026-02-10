import * as z from 'zod';
import { VALIDATION_MESSAGES } from '@/lib/constants/messages';
import {
  nullableDurationSchema,
  optionalDurationSchema,
  nullablePaceSchema,
  optionalPaceSchema,
  nullableHeartRateSchema,
  optionalNullableNumberSchema,
  isValidNullableNumber,
  nullablePositiveNumberSchema,
} from './schemas/primitives';
import { stravaActivitySchema } from './schemas/entities';
import { RPE } from '@/lib/constants/validation';

// ============================================================================
// INTERVAL STEP SCHEMA (for form)
// ============================================================================

const intervalStepSchema = z.object({
  stepNumber: z.number().optional(),
  stepType: z.enum(['warmup', 'effort', 'recovery', 'cooldown']),
  duration: nullableDurationSchema,
  distance: z.number().nullable(),
  pace: nullablePaceSchema,
  hr: nullableHeartRateSchema,
});

// ============================================================================
// FORM SCHEMA
// ============================================================================

const formSchema = z.object({
  isCompletion: z.boolean().optional(),
  date: z.string().optional().nullable(),
  sessionType: z.string().min(1, VALIDATION_MESSAGES.SESSION_TYPE_REQUIRED),
  duration: nullableDurationSchema,
  distance: nullablePositiveNumberSchema,
  avgPace: nullablePaceSchema,
  avgHeartRate: z.number().nullable().optional().refine(isValidNullableNumber, {
    message: VALIDATION_MESSAGES.NUMBER_REQUIRED,
  }),
  perceivedExertion: z.number().nullable().optional().refine(
    (val) => val === null || val === undefined || (typeof val === 'number' && val >= RPE.MIN && val <= RPE.MAX),
    { message: VALIDATION_MESSAGES.RPE_RANGE }
  ),
  comments: z.string(),

  // Interval fields (flattened for form)
  workoutType: z.string().optional(),
  repetitionCount: optionalNullableNumberSchema,
  effortDuration: optionalDurationSchema,
  recoveryDuration: optionalDurationSchema,
  effortDistance: optionalNullableNumberSchema,
  recoveryDistance: optionalNullableNumberSchema,
  targetEffortPace: optionalPaceSchema,
  targetEffortHR: optionalNullableNumberSchema,
  targetRecoveryPace: optionalPaceSchema,
  steps: z.array(intervalStepSchema).optional(),

  // External/Strava fields
  externalId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  stravaData: stravaActivitySchema.optional().nullable(),
  elevationGain: z.number().optional().nullable(),
  averageCadence: z.number().optional().nullable(),
  averageTemp: z.number().optional().nullable(),
  calories: z.number().optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.isCompletion) return;

  if (!data.date || data.date.trim() === '') {
    ctx.addIssue({
      code: 'custom',
      message: VALIDATION_MESSAGES.DATE_REQUIRED,
      path: ['date'],
    });
  }

  if (!data.duration || data.duration.trim() === '') {
    ctx.addIssue({
      code: 'custom',
      message: VALIDATION_MESSAGES.DURATION_REQUIRED,
      path: ['duration'],
    });
  }

  if (data.distance === null) {
    ctx.addIssue({
      code: 'custom',
      message: VALIDATION_MESSAGES.DISTANCE_REQUIRED,
      path: ['distance'],
    });
  }

  if (!data.avgPace || data.avgPace.trim() === '') {
    ctx.addIssue({
      code: 'custom',
      message: VALIDATION_MESSAGES.PACE_REQUIRED,
      path: ['avgPace'],
    });
  }
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type FormValues = z.infer<typeof formSchema>;

export type IntervalFormValues = {
  workoutType?: string | null;
  repetitionCount?: number | null;
  effortDuration?: string | null;
  effortDistance?: number | null;
  recoveryDuration?: string | null;
  recoveryDistance?: number | null;
  targetEffortPace?: string | null;
  targetEffortHR?: number | null;
  actualEffortPace?: string | null;
  actualEffortHR?: number | null;
  targetRecoveryPace?: string | null;
  steps?: {
    stepNumber?: number;
    stepType: 'warmup' | 'effort' | 'recovery' | 'cooldown';
    duration: string | null;
    distance: number | null;
    pace: string | null;
    hr: number | null;
  }[];
};

export { formSchema, intervalStepSchema };
