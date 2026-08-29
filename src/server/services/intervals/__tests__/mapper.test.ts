import { describe, it, expect } from 'vitest';
import { sessionSchema } from '@/lib/validation/session';
import { stravaPayloadSchema, stravaStreamPayloadSchema } from '@/lib/validation/payloads';
import {
  mapIntervalsActivityToSessionPayload,
  buildPolylineFromStreams,
  encodePolyline,
  mapStreamsToStravaShape,
} from '../mapper';
import type { IntervalsActivity, IntervalsStream } from '../client';

const activity: IntervalsActivity = {
  id: '123456789',
  start_date_local: '2026-08-28T18:30:00',
  start_date: '2026-08-28T16:30:00Z',
  type: 'Run',
  name: 'Footing du soir',
  distance: 8040,
  moving_time: 2712,
  elapsed_time: 2800,
  total_elevation_gain: 42,
  average_speed: 2.965,
  max_speed: 4.1,
  average_heartrate: 152.4,
  max_heartrate: 171,
  average_cadence: 82.5,
  calories: 512.7,
  external_id: 'garmin_push_12345',
};

const streams: IntervalsStream[] = [
  { type: 'time', data: [0, 1, 2] },
  { type: 'heartrate', data: [120, 130, 140] },
  { type: 'velocity_smooth', data: [2.8, 3.0, 3.1] },
  { type: 'latlng', data: [[48.8566, 2.3522], [48.8570, 2.3530], [48.8574, 2.3538]] },
];

describe('intervals mapper', () => {
  it('produces a payload accepted by sessionSchema end-to-end', () => {
    const payload = mapIntervalsActivityToSessionPayload(activity, streams);
    const parsed = sessionSchema.parse(payload);

    expect(parsed.source).toBe('intervals_icu');
    expect(parsed.externalId).toBe('123456789');
    expect(parsed.distance).toBe(8.04);
    expect(parsed.duration).toBe('45:12');
    expect(parsed.avgPace).toBe('05:37');
    expect(parsed.avgHeartRate).toBe(152);
    expect(parsed.comments).toBe('Footing du soir');
    expect(parsed.calories).toBe(513);
  });

  it('produces stravaData and streams accepted by the storage payload schemas', () => {
    const payload = mapIntervalsActivityToSessionPayload(activity, streams);

    expect(stravaPayloadSchema.safeParse(payload.stravaData).success).toBe(true);
    expect(payload.stravaData.map?.summary_polyline).toBeTruthy();
    expect(stravaStreamPayloadSchema.safeParse(payload.stravaStreams).success).toBe(true);
    expect(payload.stravaStreams?.heartrate.data).toEqual([120, 130, 140]);
    expect(payload.stravaStreams?.latlng).toBeUndefined();
  });

  it('handles an activity without streams or optional fields', () => {
    const minimal: IntervalsActivity = {
      id: 'i98765',
      start_date_local: '2026-08-27T07:00:00',
      type: 'Run',
      distance: 5000,
      moving_time: 1500,
    };

    const payload = mapIntervalsActivityToSessionPayload(minimal, []);
    const parsed = sessionSchema.parse(payload);

    expect(parsed.avgPace).toBe('05:00');
    expect(parsed.avgHeartRate).toBeNull();
    expect(payload.stravaData.map).toBeUndefined();
    expect(payload.stravaStreams).toBeNull();
  });

  it('encodes a Google polyline round-trippable prefix', () => {
    expect(encodePolyline([[38.5, -120.2]])).toBe('_p~iF~ps|U');
  });

  it('drops latlng from mapped streams but keeps numeric ones', () => {
    const mapped = mapStreamsToStravaShape(streams);
    expect(Object.keys(mapped ?? {})).toEqual(['time', 'heartrate', 'velocity_smooth']);
    expect(mapped?.time.original_size).toBe(3);
  });

  it('returns null polyline when latlng is missing or too short', () => {
    expect(buildPolylineFromStreams([{ type: 'heartrate', data: [1] }])).toBeNull();
    expect(buildPolylineFromStreams([{ type: 'latlng', data: [[48.8, 2.3]] }])).toBeNull();
  });
});
