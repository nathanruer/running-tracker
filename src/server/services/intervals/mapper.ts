import 'server-only';
import { formatDuration } from '@/lib/utils/duration';
import type { IntervalsActivity, IntervalsStream } from './client';

export const INTERVALS_SOURCE = 'intervals_icu';

export const IMPORTABLE_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);

const MAX_POLYLINE_POINTS = 400;

function encodeNumber(value: number, output: string[]) {
  let v = value < 0 ? ~(value << 1) : value << 1;
  while (v >= 0x20) {
    output.push(String.fromCharCode((0x20 | (v & 0x1f)) + 63));
    v >>= 5;
  }
  output.push(String.fromCharCode(v + 63));
}

export function encodePolyline(points: Array<[number, number]>): string {
  const output: string[] = [];
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of points) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    encodeNumber(latE5 - prevLat, output);
    encodeNumber(lngE5 - prevLng, output);
    prevLat = latE5;
    prevLng = lngE5;
  }

  return output.join('');
}

function downsample<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}

function isLatLngPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

export function buildPolylineFromStreams(streams: IntervalsStream[]): string | null {
  const latlng = streams.find((s) => s.type === 'latlng');
  if (!latlng) return null;

  const pairs = latlng.data.filter(isLatLngPair);
  if (pairs.length < 2) return null;

  return encodePolyline(downsample(pairs, MAX_POLYLINE_POINTS));
}

export function mapStreamsToStravaShape(
  streams: IntervalsStream[]
): Record<string, { data: number[]; series_type: 'distance'; original_size: number; resolution: 'high' }> | null {
  const result: Record<string, { data: number[]; series_type: 'distance'; original_size: number; resolution: 'high' }> = {};

  for (const stream of streams) {
    if (stream.type === 'latlng') continue;
    const data = stream.data.filter((v): v is number => typeof v === 'number');
    if (data.length === 0) continue;
    result[stream.type] = {
      data,
      series_type: 'distance',
      original_size: data.length,
      resolution: 'high',
    };
  }

  return Object.keys(result).length ? result : null;
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0 || durationSeconds <= 0) return '00:00';
  return formatDuration(Math.round(durationSeconds / distanceKm));
}

function numericId(id: string): number {
  const digits = Number(id.replace(/\D/g, ''));
  return Number.isFinite(digits) && digits > 0 ? digits : 0;
}

export function mapIntervalsActivityToSessionPayload(
  activity: IntervalsActivity,
  streams: IntervalsStream[]
) {
  const distanceKm = (activity.distance ?? 0) / 1000;
  const movingSeconds = activity.moving_time ?? activity.elapsed_time ?? 0;
  const polyline = buildPolylineFromStreams(streams);
  const mappedStreams = mapStreamsToStravaShape(streams);

  const stravaShapedActivity = {
    id: numericId(activity.id),
    name: activity.name ?? 'Course',
    distance: activity.distance ?? 0,
    moving_time: movingSeconds,
    elapsed_time: activity.elapsed_time ?? movingSeconds,
    total_elevation_gain: activity.total_elevation_gain ?? 0,
    type: 'Run',
    start_date: activity.start_date ?? activity.start_date_local,
    start_date_local: activity.start_date_local,
    average_speed: activity.average_speed ?? (movingSeconds > 0 ? (activity.distance ?? 0) / movingSeconds : 0),
    max_speed: activity.max_speed ?? activity.average_speed ?? 0,
    ...(activity.average_heartrate != null ? { average_heartrate: activity.average_heartrate } : {}),
    ...(activity.max_heartrate != null ? { max_heartrate: activity.max_heartrate } : {}),
    ...(activity.average_cadence != null ? { average_cadence: activity.average_cadence } : {}),
    ...(activity.calories != null ? { calories: activity.calories } : {}),
    ...(polyline ? { map: { id: `intervals_${activity.id}`, summary_polyline: polyline } } : {}),
    external_id: activity.external_id ?? null,
  };

  return {
    date: activity.start_date_local,
    sessionType: null,
    duration: formatDuration(movingSeconds),
    distance: Math.round(distanceKm * 100) / 100,
    avgPace: formatPace(distanceKm, movingSeconds),
    avgHeartRate: activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null,
    perceivedExertion: null,
    comments: activity.name ?? '',
    externalId: activity.id,
    source: INTERVALS_SOURCE,
    stravaData: stravaShapedActivity,
    stravaStreams: mappedStreams,
    elevationGain: activity.total_elevation_gain ?? null,
    averageCadence: activity.average_cadence ?? null,
    calories: activity.calories != null ? Math.round(activity.calories) : null,
  };
}
