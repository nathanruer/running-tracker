import * as z from 'zod';

const nullableNumberRefinement = (n: unknown) => 
  n === null || n === undefined || (typeof n === 'number' && !isNaN(n));

const numberRefinement = { message: 'Nombre requis' };

const intervalStepSchema = z.object({
  stepNumber: z.number(),
  stepType: z.enum(['warmup', 'effort', 'recovery', 'cooldown']),
  duration: z.string().nullable(),
  distance: z.number().nullable(),
  pace: z.string().nullable(),
  hr: z.number().nullable(),
});

const formSchema = z.object({
  date: z.string(),
  sessionType: z.string().min(1, 'Type de séance requis'),
  duration: z.string().regex(/^\d{1,2}:\d{2}:\d{2}$/, 'Format: HH:MM:SS'),
  distance: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  avgPace: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format: MM:SS'),
  avgHeartRate: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  perceivedExertion: z.number().min(0).max(10).nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  comments: z.string(),
  // Interval fields
  workoutType: z.string().optional(),
  repetitionCount: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  effortDuration: z.string().optional(),
  recoveryDuration: z.string().optional(),
  effortDistance: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  recoveryDistance: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  targetEffortPace: z.string().optional(),
  targetEffortHR: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  targetRecoveryPace: z.string().optional(),
  steps: z.array(intervalStepSchema).optional(),
});

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
  steps?: z.infer<typeof intervalStepSchema>[];
};

export { formSchema, intervalStepSchema };
