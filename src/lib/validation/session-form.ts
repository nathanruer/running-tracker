import * as z from 'zod';
import { validateDurationInput, validatePaceInput } from '@/lib/utils/duration';

const nullableNumberRefinement = (n: unknown) =>
  n === null || n === undefined || (typeof n === 'number' && !isNaN(n));

const numberRefinement = { message: 'Nombre requis' };

const intervalStepSchema = z.object({
  stepNumber: z.number(),
  stepType: z.enum(['warmup', 'effort', 'recovery', 'cooldown']),
  duration: z.string().nullable().refine(
    (val) => val === null || val === '' || validateDurationInput(val),
    { message: 'Format: MM:SS ou HH:MM:SS' }
  ),
  distance: z.number().nullable(),
  pace: z.string().nullable().refine(
    (val) => val === null || val === '' || validatePaceInput(val),
    { message: 'Format: MM:SS' }
  ),
  hr: z.number().nullable(),
});

const formSchema = z.object({
  date: z.string(),
  sessionType: z.string().min(1, 'Type de séance requis'),
  duration: z.string().refine(
    (val) => val === '' || validateDurationInput(val),
    { message: 'Format: MM:SS ou HH:MM:SS' }
  ),
  distance: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  avgPace: z.string().refine(
    (val) => val === '' || validatePaceInput(val),
    { message: 'Format: MM:SS' }
  ),
  avgHeartRate: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  perceivedExertion: z.number().nullable().optional().refine(
    (val) => val === null || val === undefined || (typeof val === 'number' && val >= 0 && val <= 10),
    { message: 'Entre 0 et 10' }
  ),
  comments: z.string(),
  workoutType: z.string().optional(),
  repetitionCount: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  effortDuration: z.string().optional().refine(
    (val) => !val || val === '' || validateDurationInput(val),
    { message: 'Format: MM:SS ou HH:MM:SS' }
  ),
  recoveryDuration: z.string().optional().refine(
    (val) => !val || val === '' || validateDurationInput(val),
    { message: 'Format: MM:SS ou HH:MM:SS' }
  ),
  effortDistance: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  recoveryDistance: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  targetEffortPace: z.string().optional().refine(
    (val) => !val || val === '' || validatePaceInput(val),
    { message: 'Format: MM:SS' }
  ),
  targetEffortHR: z.number().nullable().optional().refine(nullableNumberRefinement, numberRefinement),
  targetRecoveryPace: z.string().optional().refine(
    (val) => !val || val === '' || validatePaceInput(val),
    { message: 'Format: MM:SS' }
  ),
  steps: z.array(intervalStepSchema).optional(),
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
