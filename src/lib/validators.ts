import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir 6 caractères minimum'),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const sessionSchema = z.object({
  sessionNumber: z.number().int().min(1),
  week: z.number().int().min(1),
  date: z.string(),
  sessionType: z.string().min(1),
  duration: z
    .string()
    .regex(/^\d{1,2}:\d{2}:\d{2}$/, 'Format HH:MM:SS'),
  distance: z.number().min(0),
  avgPace: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, 'Format MM:SS'),
  avgHeartRate: z.number().min(0),
  comments: z.string().optional().default(''),
});

export const partialSessionSchema = sessionSchema.partial();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;

