export type {
  Stream,
  StreamSet,
} from '@/lib/validation/schemas/entities';

export { streamSchema, streamSetSchema } from '@/lib/validation/schemas/entities';

/** Series stored per workout (intervals.icu naming, velocity as `velocity_smooth`). */
export type StreamType =
  | 'time'
  | 'distance'
  | 'velocity_smooth'
  | 'heartrate'
  | 'cadence'
  | 'altitude';
