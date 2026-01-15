/**
 * Validation configuration for distance calculations
 */
export const DISTANCE_VALIDATION = {
  ABSOLUTE_TOLERANCE_KM: 0.025,
  RELATIVE_TOLERANCE_PERCENT: 0.1,
  AI_TOLERANCE_PERCENT: 0.05,
} as const;

export interface DistanceEstimationConfig {
  tolerancePercent?: number;
  absoluteToleranceKm?: number;
  alwaysEstimate?: boolean;
  precision?: number;
}

export interface DistanceEstimationResult {
  distance: number;
  isEstimated: boolean;
  wasAdjusted: boolean;
}

/**
 * Calculate theoretical distance from duration and pace
 *
 * @param durationSec Duration in seconds
 * @param paceSec Pace in seconds per km
 * @returns Distance in km
 */
export function calculateDistanceFromPace(
  durationSec: number,
  paceSec: number
): number {
  if (durationSec <= 0 || paceSec <= 0) return 0;
  return durationSec / paceSec;
}

/**
 * Check if two distances are within tolerance
 *
 * @param distance1 First distance in km
 * @param distance2 Second distance in km
 * @param config Estimation configuration
 * @returns True if distances are within tolerance
 */
export function isWithinTolerance(
  distance1: number,
  distance2: number,
  config: DistanceEstimationConfig = {}
): boolean {
  const {
    tolerancePercent = DISTANCE_VALIDATION.RELATIVE_TOLERANCE_PERCENT,
    absoluteToleranceKm = DISTANCE_VALIDATION.ABSOLUTE_TOLERANCE_KM,
  } = config;

  const absoluteDiff = Math.abs(distance1 - distance2);

  if (absoluteDiff < absoluteToleranceKm) {
    return true;
  }

  const reference = Math.max(distance1, distance2);
  if (reference === 0) return false;

  const relativeDiff = absoluteDiff / reference;
  return relativeDiff <= tolerancePercent;
}

/**
 * Estimate effective distance considering recorded distance and calculated distance from pace
 *
 * Logic:
 * 1. If no recorded distance, use calculated
 * 2. If alwaysEstimate is true, use calculated
 * 3. If recorded and calculated are within tolerance, use recorded
 * 4. If outside tolerance, prefer calculated (more reliable)
 */
export function estimateEffectiveDistance(
  durationSec: number,
  paceSec: number | null,
  recordedDistance: number | null,
  config: DistanceEstimationConfig = {}
): DistanceEstimationResult {
  const {
    alwaysEstimate = false,
    precision = 2,
  } = config;

  if (!paceSec || paceSec <= 0 || durationSec <= 0) {
    const distance = recordedDistance && recordedDistance > 0 ? recordedDistance : 0;
    return {
      distance: Number(distance.toFixed(precision)),
      isEstimated: false,
      wasAdjusted: false,
    };
  }

  const theoreticalDistance = calculateDistanceFromPace(durationSec, paceSec);

  if (!recordedDistance || recordedDistance === 0 || alwaysEstimate) {
    return {
      distance: Number(theoreticalDistance.toFixed(precision)),
      isEstimated: true,
      wasAdjusted: false,
    };
  }

  const withinTolerance = isWithinTolerance(recordedDistance, theoreticalDistance, config);

  if (withinTolerance) {
    return {
      distance: Number(recordedDistance.toFixed(precision)),
      isEstimated: false,
      wasAdjusted: false,
    };
  }

  return {
    distance: Number(theoreticalDistance.toFixed(precision)),
    isEstimated: true,
    wasAdjusted: true,
  };
}

/**
 * Validate and adjust distance based on duration and pace
 * Used by AI validator to ensure consistency
 */
export function validateAndAdjustDistance(
  durationMin: number,
  distanceKm: number,
  paceMinPerKm: string
): number {
  const paceMatch = paceMinPerKm.match(/^(\d+):(\d+)$/);
  if (!paceMatch) return distanceKm;

  const paceMin = parseInt(paceMatch[1], 10);
  const paceSec = parseInt(paceMatch[2], 10);
  const paceTotalSec = paceMin * 60 + paceSec;

  if (paceTotalSec === 0) return distanceKm;

  const durationSec = durationMin * 60;
  const theoreticalDist = durationSec / paceTotalSec;

  const diffPercent = Math.abs(distanceKm - theoreticalDist) / theoreticalDist;

  if (diffPercent > DISTANCE_VALIDATION.AI_TOLERANCE_PERCENT) {
    return Number(theoreticalDist.toFixed(2));
  }

  return distanceKm;
}
