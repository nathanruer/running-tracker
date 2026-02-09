import 'server-only';
import { z } from 'zod';
import { logger } from './logger';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, "Le secret JWT doit faire au moins 32 caractères pour être sécurisé"),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  STRAVA_CLIENT_ID: z.string().optional(),
  STRAVA_CLIENT_SECRET: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  logger.error({ errors: _env.error.format() }, 'Environnement invalide');
  throw new Error('Variables d\'environnement manquantes ou invalides.');
}

export const env = _env.data;
