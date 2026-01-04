import type { StravaStreamSet } from '@/lib/types';

/**
 * Converts velocity (m/s) to pace (seconds per km)
 */
function mpsToSecondsPerKm(mps: number): number {
  if (mps <= 0) return 0;
  return 1000 / mps;
}

/**
 * Formats pace (seconds per km) to MM:SS string
 */
export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm === 0 || !isFinite(secondsPerKm)) return '-';
  const totalSeconds = Math.round(secondsPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Converts m/s to formatted MM:SS string
 */
function mpsToMinPerKm(mps: number): string {
  return formatPace(mpsToSecondsPerKm(mps));
}

/**
 * Generic data point for stream charts
 */
export interface StreamDataPoint {
  distance: number;
  time: number;
  value: number;
  formattedValue: string;
}

/**
 * Stream chart configuration
 */
export interface StreamChartConfig {
  key: string;
  label: string;
  unit: string;
  color: string;
  gradientId: string;
  formatValue: (value: number) => string;
  formatTooltip: (value: number) => string;
  reversed?: boolean;
  domain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
}

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
 * Prepares pace data for charting
 */
export function preparePaceData(streams: StravaStreamSet): StreamDataPoint[] {
  const velocity = streams.velocity_smooth?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (velocity.length === 0) return [];

  return velocity.map((v, i) => ({
    distance: distance[i] ? parseFloat((distance[i] / 1000).toFixed(2)) : i,
    time: time[i] || i,
    value: mpsToSecondsPerKm(v),
    formattedValue: mpsToMinPerKm(v),
  }));
}

/**
 * Prepares heart rate data for charting
 */
export function prepareHeartrateData(streams: StravaStreamSet): StreamDataPoint[] {
  const heartrate = streams.heartrate?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (heartrate.length === 0) return [];

  return heartrate.map((v, i) => ({
    distance: distance[i] ? parseFloat((distance[i] / 1000).toFixed(2)) : i,
    time: time[i] || i,
    value: v,
    formattedValue: `${Math.round(v)} bpm`,
  }));
}

/**
 * Prepares cadence data for charting
 */
export function prepareCadenceData(streams: StravaStreamSet): StreamDataPoint[] {
  const cadence = streams.cadence?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (cadence.length === 0) return [];

  return cadence.map((v, i) => ({
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
