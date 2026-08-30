import { streamSetSchema, type StreamSet } from './schemas/entities';

export function validateStreams(data: unknown): StreamSet | null {
  const result = streamSetSchema.safeParse(data);
  return result.success ? result.data : null;
}
