import { z } from 'zod';
import { validateDurationInput, validatePaceInput } from '@/lib/utils/duration';

export const intervalStepSchema = z.object({
  stepNumber: z.number().min(1),
  stepType: z.enum(['warmup', 'effort', 'recovery', 'cooldown']),
  duration: z.string().nullable().refine(
    (val) => val === null || val === '' || validateDurationInput(val),
    { message: 'Format MM:SS ou HH:MM:SS' }
  ),
  distance: z.number().min(0).nullable(),
  pace: z.string().nullable().refine(
    (val) => val === null || val === '' || validatePaceInput(val),
    { message: 'Format MM:SS ou HH:MM:SS' }
  ),
  hr: z.number().min(0).max(250).nullable(),
});

export const intervalDetailsSchema = z.object({
  workoutType: z.string().nullable(),
  repetitionCount: z.number().min(1).nullable(),
  effortDuration: z.string().nullable().refine(
    (val) => val === null || val === '' || validateDurationInput(val),
    { message: 'Format MM:SS ou HH:MM:SS' }
  ),
  recoveryDuration: z.string().nullable().refine(
    (val) => val === null || val === '' || validateDurationInput(val),
    { message: 'Format MM:SS ou HH:MM:SS' }
  ),
  effortDistance: z.number().min(0).nullable(),

  targetEffortPace: z.string().nullable().refine(
    (val) => val === null || val === '' || validatePaceInput(val),
    { message: 'Format MM:SS ou HH:MM:SS' }
  ),
  targetEffortHR: z.number().min(0).max(250).nullable(),
  targetRecoveryPace: z.string().nullable().refine(
    (val) => val === null || val === '' || validatePaceInput(val),
    { message: 'Format MM:SS ou HH:MM:SS' }
  ),

  steps: z.array(intervalStepSchema),
}).nullable();

export const sessionSchema = z.object({
  date: z.string(),
  sessionType: z.string().min(1),
  duration: z.string().refine(
    (val) => validateDurationInput(val),
    { message: 'Format HH:MM:SS' }
  ),
  distance: z.number().min(0).transform((val) => Math.round(val * 100) / 100),
  avgPace: z.string().refine(
    (val) => validatePaceInput(val),
    { message: 'Format MM:SS ou HH:MM:SS' }
  ),
  avgHeartRate: z.number().min(0).optional().nullable(),
  intervalDetails: intervalDetailsSchema.optional(),
  perceivedExertion: z.number().min(0).max(10).optional().nullable(),
  comments: z.string().optional().default(''),
  externalId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  stravaData: z.any().optional().nullable(),
  elevationGain: z.number().optional().nullable(),
  averageCadence: z.number().optional().nullable(),
  averageTemp: z.number().optional().nullable(),
  calories: z.number().optional().nullable(),
});

export const partialSessionSchema = sessionSchema.partial();

export type SessionInput = z.infer<typeof sessionSchema>;
export type IntervalDetailsInput = z.infer<typeof intervalDetailsSchema>;
export type IntervalStepInput = z.infer<typeof intervalStepSchema>;
