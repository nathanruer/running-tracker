import { z } from 'zod';
import { weatherDataSchema } from './schemas/entities';

export const weatherPayloadSchema = weatherDataSchema.partial().passthrough();

export const streamPayloadSchema = z.record(
  z.string(),
  z.object({ data: z.array(z.number()) }).passthrough()
);
