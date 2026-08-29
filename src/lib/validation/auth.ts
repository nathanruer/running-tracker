import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir 6 caractères minimum'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

const emptyToUndefined = (value: unknown) =>
  value === '' || value == null ? undefined : value;

export const updateProfileSchema = z.object({
  weight: z.preprocess(emptyToUndefined, z.coerce.number().positive().max(400).optional()),
  age: z.preprocess(emptyToUndefined, z.coerce.number().int().min(10).max(120).optional()),
  maxHeartRate: z.preprocess(emptyToUndefined, z.coerce.number().int().min(80).max(250).optional()),
  vma: z.preprocess(emptyToUndefined, z.coerce.number().positive().max(30).optional()),
  goal: z.string().max(2000).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
