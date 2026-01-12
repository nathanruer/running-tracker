import type { StravaStreamSet } from '@/lib/types';
import type { StreamDataPoint, StreamChartConfig } from '@/lib/types/stream-charts';
import { mpsToSecondsPerKm, mpsToMinPerKm, formatPace } from '@/lib/utils/formatters/pace';

/**
 * Available stream chart configurations
 */
export const STREAM_CONFIGS: Record<string, StreamChartConfig> = {
  altitude: {
    key: 'altitude',
    label: 'Altitude',
    unit: 'm',
    color: '#22c55e',
    gradientId: 'altitudeGradient',
    formatValue: (v) => `${Math.round(v)}`,
    formatTooltip: (v) => `${Math.round(v)} m`,
    domain: ['dataMin', 'dataMax'],
  },
  pace: {
    key: 'pace',
    label: 'Allure',
    unit: 'min/km',
    color: '#3b82f6',
    gradientId: 'paceGradient',
    formatValue: (v) => formatPace(v),
    formatTooltip: (v) => `${formatPace(v)} /km`,
    reversed: true,
  },
  heartrate: {
    key: 'heartrate',
    label: 'Fréquence cardiaque',
    unit: 'bpm',
    color: '#ef4444',
    gradientId: 'heartrateGradient',
    formatValue: (v) => `${Math.round(v)}`,
    formatTooltip: (v) => `${Math.round(v)} bpm`,
  },
  cadence: {
    key: 'cadence',
    label: 'Cadence',
    unit: 'ppm',
    color: '#f97316',
    gradientId: 'cadenceGradient',
    formatValue: (v) => `${Math.round(v * 2)}`, // Strava gives half cadence (one leg)
    formatTooltip: (v) => `${Math.round(v * 2)} ppm`,
  },
};

/**
 * Prepares altitude data for charting
 */
export function prepareAltitudeData(streams: StravaStreamSet): StreamDataPoint[] {
  const altitude = streams.altitude?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (altitude.length === 0) return [];

  return altitude.map((v, i) => ({
    distance: distance[i] ? parseFloat((distance[i] / 1000).toFixed(2)) : i,
    time: time[i] || i,
    value: v,
    formattedValue: `${Math.round(v)} m`,
  }));
}

/**
 * Applies a rolling average to smooth noisy data
 * Uses a centered window for better results
 */
function applyRollingAverage(values: number[], windowSize: number): number[] {
  const halfWindow = Math.floor(windowSize / 2);

  return values.map((_, index) => {
    const start = Math.max(0, index - halfWindow);
    const end = Math.min(values.length, index + halfWindow + 1);
    const windowValues = values.slice(start, end);

    return windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
  });
}

/**
 * Prepares pace data for charting
 * Applies smoothing for better visualization while maintaining data integrity
 */
export function preparePaceData(streams: StravaStreamSet): StreamDataPoint[] {
  const velocity = streams.velocity_smooth?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (velocity.length === 0) return [];

  const MIN_VELOCITY = 1.2; // ~13:53 min/km - anything slower gets clamped
  const MAX_VELOCITY = 10.0; // ~1:40 min/km - anything faster gets clamped

  const clampedVelocities = velocity.map(v =>
    Math.max(MIN_VELOCITY, Math.min(MAX_VELOCITY, v))
  );

  const smoothedVelocities = applyRollingAverage(clampedVelocities, 25);

  return smoothedVelocities.map((v, i) => ({
    distance: distance[i] ? parseFloat((distance[i] / 1000).toFixed(2)) : i,
    time: time[i] || i,
    value: mpsToSecondsPerKm(v),
    formattedValue: mpsToMinPerKm(v),
  }));
}

/**
 * Prepares heart rate data for charting
 * Applies light smoothing to reduce sensor noise
 */
export function prepareHeartrateData(streams: StravaStreamSet): StreamDataPoint[] {
  const heartrate = streams.heartrate?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (heartrate.length === 0) return [];

  const smoothedHeartrate = applyRollingAverage(heartrate, 7);

  return smoothedHeartrate.map((v, i) => ({
    distance: distance[i] ? parseFloat((distance[i] / 1000).toFixed(2)) : i,
    time: time[i] || i,
    value: v,
    formattedValue: `${Math.round(v)} bpm`,
  }));
}

/**
 * Prepares cadence data for charting
 * Applies smoothing for better visualization
 */
export function prepareCadenceData(streams: StravaStreamSet): StreamDataPoint[] {
  const cadence = streams.cadence?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (cadence.length === 0) return [];

  const MIN_CADENCE = 30;

  const clampedCadence = cadence.map(v => Math.max(MIN_CADENCE, v));

  const smoothedCadence = applyRollingAverage(clampedCadence, 25);

  return smoothedCadence.map((v, i) => ({
    distance: distance[i] ? parseFloat((distance[i] / 1000).toFixed(2)) : i,
    time: time[i] || i,
    value: v,
    formattedValue: `${Math.round(v * 2)} ppm`,
  }));
}

/**
 * Gets available streams from a stream set
 */
export function getAvailableStreams(streams: StravaStreamSet): string[] {
  const available: string[] = [];
  
  if (streams.altitude?.data?.length) available.push('altitude');
  if (streams.velocity_smooth?.data?.length) available.push('pace');
  if (streams.heartrate?.data?.length) available.push('heartrate');
  if (streams.cadence?.data?.length) available.push('cadence');
  
  return available;
}

/**
 * Calculates average value for a stream
 */
export function calculateStreamAverage(data: StreamDataPoint[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, point) => acc + point.value, 0);
  return sum / data.length;
}

/**
 * Calculates an optimized domain for pace data to focus on the main data range
 * Uses a gentle percentile-based approach that works well with smoothed data
 */
export function calculatePaceDomain(data: StreamDataPoint[]): [number, number] | undefined {
  if (data.length === 0) return undefined;

  const sortedValues = [...data].map(d => d.value).sort((a, b) => a - b);

  const dataMin = sortedValues[0];
  const dataMax = sortedValues[sortedValues.length - 1];

  const range = dataMax - dataMin;
  const padding = range * 0.10;

  return [
    Math.max(0, dataMin - padding),
    dataMax + padding
  ];
}
