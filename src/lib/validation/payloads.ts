import { z } from 'zod';
import {
  stravaActivitySchema,
  stravaStreamSchema,
  weatherDataSchema,
} from './schemas/entities';

export const weatherPayloadSchema = weatherDataSchema.partial().passthrough();
export const stravaPayloadSchema = stravaActivitySchema.partial().passthrough();
export const stravaStreamPayloadSchema = z.record(
  z.string(),
  stravaStreamSchema.partial().passthrough()
);
