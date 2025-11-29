import { z } from 'zod';

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
  intervalStructure: z.string().optional(),
  perceivedExertion: z.number().min(0).max(10).optional().nullable(),
  comments: z.string().optional().default(''),
});

export const partialSessionSchema = sessionSchema.partial();

export type SessionInput = z.infer<typeof sessionSchema>;
