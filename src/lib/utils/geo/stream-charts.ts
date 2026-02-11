import type { StravaStreamSet } from '@/lib/types';
import type { StreamDataPoint, StreamChartConfig } from '@/lib/types/stream-charts';
import { mpsToSecondsPerKm, formatPace } from '@/lib/utils/pace';

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
    curveType: 'linear',
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

function toDistanceKm(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.round((value / 1000) * 1000) / 1000;
}

function getMedianPositiveDelta(values: number[]): number | null {
  if (values.length < 2) return null;

  const deltas: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    if (Number.isFinite(delta) && delta > 0) {
      deltas.push(delta);
    }
  }

  if (deltas.length === 0) return null;

  deltas.sort((a, b) => a - b);
  const middle = Math.floor(deltas.length / 2);
  if (deltas.length % 2 === 0) {
    return (deltas[middle - 1] + deltas[middle]) / 2;
  }
  return deltas[middle];
}

function getQuantile(sortedValues: number[], quantile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const q = Math.min(1, Math.max(0, quantile));
  const position = (sortedValues.length - 1) * q;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.min(sortedValues.length - 1, lowerIndex + 1);
  const weight = position - lowerIndex;

  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight;
}

function smoothIsolatedPauseArtifacts(velocities: number[]): number[] {
  if (velocities.length < 2) return [...velocities];

  const PAUSE_SPIKE_THRESHOLD = 0.8; // ~20:50 min/km
  const MOVING_THRESHOLD = 1.3; // ~12:49 min/km

  return velocities.map((value, index) => {
    if (value >= PAUSE_SPIKE_THRESHOLD) return value;

    if (index === 0) {
      const next = velocities[1];
      return next > MOVING_THRESHOLD ? next : value;
    }

    if (index === velocities.length - 1) {
      const previous = velocities[index - 1];
      return previous > MOVING_THRESHOLD ? previous : value;
    }

    const previous = velocities[index - 1];
    const next = velocities[index + 1];
    const isIsolatedPause = previous > MOVING_THRESHOLD && next > MOVING_THRESHOLD;

    if (!isIsolatedPause) return value;

    return (previous + next) / 2;
  });
}

function normalizeMissingVelocityArtifacts(velocities: number[]): number[] {
  if (velocities.length === 0) return [];

  const MISSING_THRESHOLD = 0.15;
  const isValid = (v: number) => Number.isFinite(v) && v > MISSING_THRESHOLD;
  const normalized = [...velocities];

  const firstValidIndex = normalized.findIndex(isValid);
  if (firstValidIndex === -1) return normalized;

  for (let i = 0; i < firstValidIndex; i++) {
    normalized[i] = normalized[firstValidIndex];
  }

  let lastValidIndex = firstValidIndex;
  for (let i = firstValidIndex + 1; i < normalized.length; i++) {
    if (!isValid(normalized[i])) continue;

    const gap = i - lastValidIndex - 1;
    if (gap > 0 && gap <= 2) {
      const start = normalized[lastValidIndex];
      const end = normalized[i];
      for (let j = 1; j <= gap; j++) {
        normalized[lastValidIndex + j] = start + ((end - start) * j) / (gap + 1);
      }
    }

    lastValidIndex = i;
  }

  for (let i = lastValidIndex + 1; i < normalized.length; i++) {
    normalized[i] = normalized[lastValidIndex];
  }

  return normalized;
}

function repairShortPauseSegments(velocities: number[], time: number[]): number[] {
  if (velocities.length < 3) return [...velocities];

  const PAUSE_THRESHOLD_MPS = 0.8;
  const SHORT_PAUSE_MAX_SECONDS = 20;
  const isPaused = (v: number) => Number.isFinite(v) && v <= PAUSE_THRESHOLD_MPS;

  const repaired = [...velocities];
  const getTimeAt = (index: number) => (typeof time[index] === 'number' ? time[index] : index);

  let index = 0;
  while (index < repaired.length) {
    if (!isPaused(repaired[index])) {
      index++;
      continue;
    }

    const segmentStart = index;
    while (index + 1 < repaired.length && isPaused(repaired[index + 1])) {
      index++;
    }
    const segmentEnd = index;

    let prevMoving = segmentStart - 1;
    while (prevMoving >= 0 && isPaused(repaired[prevMoving])) prevMoving--;

    let nextMoving = segmentEnd + 1;
    while (nextMoving < repaired.length && isPaused(repaired[nextMoving])) nextMoving++;

    if (prevMoving < 0 || nextMoving >= repaired.length) {
      index++;
      continue;
    }

    const duration = getTimeAt(segmentEnd) - getTimeAt(segmentStart);
    if (duration > SHORT_PAUSE_MAX_SECONDS) {
      index++;
      continue;
    }

    const from = repaired[prevMoving];
    const to = repaired[nextMoving];
    const count = segmentEnd - segmentStart + 1;

    for (let i = 0; i < count; i++) {
      const ratio = (i + 1) / (count + 1);
      repaired[segmentStart + i] = from + (to - from) * ratio;
    }

    index++;
  }

  return repaired;
}

function winsorizePaceForDisplay(paces: number[]): number[] {
  if (paces.length < 6) return [...paces];

  const sorted = [...paces]
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  if (sorted.length < 6) return [...paces];

  const q05 = getQuantile(sorted, 0.05);
  const q25 = getQuantile(sorted, 0.25);
  const q75 = getQuantile(sorted, 0.75);
  const q95 = getQuantile(sorted, 0.95);
  const iqr = Math.max(1, q75 - q25);

  const lowerBound = Math.max(120, q05 - iqr);
  const upperBound = Math.min(900, q95 + iqr);

  return paces.map((value) => Math.max(lowerBound, Math.min(upperBound, value)));
}

function normalizeEdgePaceOutliers(paces: number[]): number[] {
  if (paces.length < 8) return [...paces];

  const edgeWindow = Math.min(10, Math.max(2, Math.floor(paces.length * 0.03)));
  const core = paces.slice(edgeWindow, paces.length - edgeWindow).filter((v) => Number.isFinite(v) && v > 0);
  if (core.length < 5) return [...paces];

  const sortedCore = [...core].sort((a, b) => a - b);
  const coreMedian = getQuantile(sortedCore, 0.50);
  const edgeMin = Math.max(120, coreMedian * 0.60);
  const edgeMax = Math.min(900, coreMedian * 1.60);

  const normalized = [...paces];

  const firstCoreIndex = normalized.findIndex((v) => v >= edgeMin && v <= edgeMax);
  if (firstCoreIndex > 0 && firstCoreIndex <= edgeWindow * 2) {
    for (let i = 0; i < firstCoreIndex; i++) {
      normalized[i] = normalized[firstCoreIndex];
    }
  }

  let lastCoreIndex = -1;
  for (let i = normalized.length - 1; i >= 0; i--) {
    const value = normalized[i];
    if (value >= edgeMin && value <= edgeMax) {
      lastCoreIndex = i;
      break;
    }
  }
  if (lastCoreIndex !== -1 && lastCoreIndex < normalized.length - 1 && normalized.length - 1 - lastCoreIndex <= edgeWindow * 2) {
    for (let i = lastCoreIndex + 1; i < normalized.length; i++) {
      normalized[i] = normalized[lastCoreIndex];
    }
  }

  return normalized;
}

/**
 * Prepares altitude data for charting
 */
export function prepareAltitudeData(streams: StravaStreamSet): StreamDataPoint[] {
  const altitude = streams.altitude?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (altitude.length === 0) return [];

  return altitude.map((v, i) => ({
    distance: toDistanceKm(distance[i], i),
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
  if (values.length < 3 || windowSize <= 1) return [...values];

  const normalizedWindow = Math.max(1, Math.floor(windowSize));
  if (normalizedWindow <= 1) return [...values];

  const halfWindow = Math.floor(normalizedWindow / 2);

  return values.map((_, index) => {
    const start = Math.max(0, index - halfWindow);
    const end = Math.min(values.length, index + halfWindow + 1);
    const windowValues = values.slice(start, end);

    return windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
  });
}

function getPaceSmoothingWindowSize(
  time: number[],
  resolution: 'low' | 'medium' | 'high' | undefined
): number {
  const targetWindowSeconds = resolution === 'high' ? 10 : resolution === 'medium' ? 4 : 0;
  if (targetWindowSeconds === 0) return 1;

  const maxWindowSize = resolution === 'high' ? 11 : 5;
  const medianDeltaSeconds = getMedianPositiveDelta(time);

  if (!medianDeltaSeconds || medianDeltaSeconds <= 0) {
    return resolution === 'high' ? 5 : 3;
  }

  const samples = Math.round(targetWindowSeconds / medianDeltaSeconds);
  const clampedSamples = Math.min(maxWindowSize, Math.max(1, samples));

  return clampedSamples % 2 === 0 ? clampedSamples + 1 : clampedSamples;
}

/**
 * Prepares pace data for charting
 * Applies smoothing for better visualization while maintaining data integrity
 */
export function preparePaceData(streams: StravaStreamSet): StreamDataPoint[] {
  const velocityStream = streams.velocity_smooth;
  const velocity = velocityStream?.data || [];
  const distance = streams.distance?.data || [];
  const time = streams.time?.data || [];

  if (velocity.length === 0) return [];

  // Keep broad bounds to reject sensor glitches while preserving recoveries.
  const MIN_VELOCITY = 0.8; // ~20:50 min/km
  const MAX_VELOCITY = 12.0; // ~1:23 min/km

  const normalizedVelocities = normalizeMissingVelocityArtifacts(velocity);

  const pauseRepairedVelocities = repairShortPauseSegments(normalizedVelocities, time);

  const clampedVelocities = pauseRepairedVelocities.map(v =>
    Math.max(MIN_VELOCITY, Math.min(MAX_VELOCITY, Number.isFinite(v) ? v : MIN_VELOCITY))
  );
  const cleanedVelocities = smoothIsolatedPauseArtifacts(clampedVelocities);

  // Strava's velocity stream is already smoothed. Use only a light adaptive pass.
  const smoothingWindow = getPaceSmoothingWindowSize(time, velocityStream?.resolution);
  const preparedVelocities = smoothingWindow > 1
    ? applyRollingAverage(cleanedVelocities, smoothingWindow)
    : cleanedVelocities;

  const paceValues = preparedVelocities.map((v) => mpsToSecondsPerKm(v));
  const edgeNormalizedPaces = normalizeEdgePaceOutliers(paceValues);
  const displayPaces = winsorizePaceForDisplay(edgeNormalizedPaces);

  return displayPaces.map((paceSeconds, i) => ({
    distance: toDistanceKm(distance[i], i),
    time: time[i] || i,
    value: paceSeconds,
    formattedValue: formatPace(paceSeconds),
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
    distance: toDistanceKm(distance[i], i),
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
    distance: toDistanceKm(distance[i], i),
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
 * Uses robust percentiles so isolated pauses/outliers do not flatten the chart
 */
export function calculatePaceDomain(data: StreamDataPoint[]): [number, number] | undefined {
  if (data.length === 0) return undefined;

  const maxDistance = data.reduce((max, point) => Math.max(max, point.distance), 0);
  const edgeTrimKm = maxDistance > 1 ? Math.min(0.2, maxDistance * 0.03) : 0;
  const coreData = edgeTrimKm > 0
    ? data.filter((point) => point.distance >= edgeTrimKm && point.distance <= maxDistance - edgeTrimKm)
    : data;
  const domainData = coreData.length >= Math.max(5, Math.floor(data.length * 0.5)) ? coreData : data;

  const sortedValues = [...domainData]
    .map((d) => d.value)
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  if (sortedValues.length === 0) return undefined;

  // 2:00/km to 15:00/km keeps display readable while still covering run + brisk walking segments.
  const HARD_MIN = 120;
  const HARD_MAX = 900;
  const MIN_RANGE = 120;

  if (sortedValues.length === 1) {
    const single = Math.min(HARD_MAX, Math.max(HARD_MIN, sortedValues[0]));
    return [Math.max(HARD_MIN, single - 60), Math.min(HARD_MAX, single + 60)];
  }

  const trimCount = sortedValues.length >= 40 ? Math.floor(sortedValues.length * 0.02) : 1;
  const trimmedValues = sortedValues.length >= 5 && trimCount * 2 < sortedValues.length
    ? sortedValues.slice(trimCount, sortedValues.length - trimCount)
    : sortedValues;

  const q05 = getQuantile(trimmedValues, 0.05);
  const q25 = getQuantile(trimmedValues, 0.25);
  const q50 = getQuantile(trimmedValues, 0.50);
  const q75 = getQuantile(trimmedValues, 0.75);
  const q95 = getQuantile(trimmedValues, 0.95);

  const iqr = Math.max(1, q75 - q25);

  let domainMin = q05 - iqr * 0.25;
  let domainMax = q95 + iqr * 1.25;

  domainMin = Math.max(HARD_MIN, domainMin);
  domainMax = Math.min(HARD_MAX, domainMax);

  if (domainMax - domainMin < MIN_RANGE) {
    domainMin = q50 - MIN_RANGE / 2;
    domainMax = q50 + MIN_RANGE / 2;
    domainMin = Math.max(HARD_MIN, domainMin);
    domainMax = Math.min(HARD_MAX, domainMax);
  }

  const range = Math.max(1, domainMax - domainMin);
  const padding = range * 0.08;

  return [
    Math.max(HARD_MIN, domainMin - padding),
    Math.min(HARD_MAX, domainMax + padding)
  ];
}
