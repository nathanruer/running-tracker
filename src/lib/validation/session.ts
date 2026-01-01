import { z } from 'zod';

export const intervalStepSchema = z.object({
  stepNumber: z.number().min(1),
  stepType: z.enum(['warmup', 'effort', 'recovery', 'cooldown']),
  duration: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format MM:SS').nullable(),
  distance: z.number().min(0).nullable(),
  pace: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format MM:SS').nullable(),
  hr: z.number().min(0).max(250).nullable(),
});

export const intervalDetailsSchema = z.object({
  workoutType: z.string().nullable(),
  repetitionCount: z.number().min(1).nullable(),
  effortDuration: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format MM:SS').nullable(),
  recoveryDuration: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format MM:SS').nullable(),
  effortDistance: z.number().min(0).nullable(),

  targetEffortPace: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format MM:SS').nullable(),
  targetEffortHR: z.number().min(0).max(250).nullable(),
  targetRecoveryPace: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format MM:SS').nullable(),

  steps: z.array(intervalStepSchema),
}).nullable();

export const sessionSchema = z.object({
  date: z.string(),
  sessionType: z.string().min(1),
  duration: z
    .string()
    .regex(/^\d{1,2}:\d{2}:\d{2}$/, 'Format HH:MM:SS'),
  distance: z.number().min(0).transform((val) => Math.round(val * 100) / 100),
  avgPace: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, 'Format MM:SS'),
  avgHeartRate: z.number().min(0),
  intervalDetails: intervalDetailsSchema.optional(),
  perceivedExertion: z.number().min(0).max(10).optional().nullable(),
  comments: z.string().optional().default(''),
  externalId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  stravaData: z.any().optional().nullable(),
  elevationGain: z.number().optional().nullable(),
  maxElevation: z.number().optional().nullable(),
  minElevation: z.number().optional().nullable(),
  averageCadence: z.number().optional().nullable(),
  averageTemp: z.number().optional().nullable(),
  calories: z.number().optional().nullable(),
});

export const partialSessionSchema = sessionSchema.partial();

export type SessionInput = z.infer<typeof sessionSchema>;
export type IntervalDetailsInput = z.infer<typeof intervalDetailsSchema>;
export type IntervalStepInput = z.infer<typeof intervalStepSchema>;
