import { z } from 'zod';
import {
  stravaActivityStoredSchema,
  stravaStreamSchema,
  weatherDataSchema,
} from './schemas/entities';

export const weatherPayloadSchema = weatherDataSchema.partial().passthrough();
export const stravaPayloadSchema = stravaActivityStoredSchema.partial().passthrough();
export const stravaStreamPayloadSchema = z.record(
  z.string(),
  stravaStreamSchema.partial().passthrough()
);
