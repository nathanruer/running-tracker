import { type IntervalFormValues } from './form';
import { isFractionneType } from '@/lib/utils/session-type';

/**
 * Checks if a duration string is valid (MM:SS or HH:MM:SS) and non-zero
 */
function isValidDuration(duration: string): boolean {
  const pattern = /^(\d{1,2}):([0-5]\d):([0-5]\d)$|^([0-5]?\d):([0-5]\d)$/;
  if (!pattern.test(duration)) return false;

  // Reject all-zero durations
  const normalized = duration.replace(/^0+:/, '');
  if (normalized === '00:00' || normalized === '0:00' || duration === '00:00:00') {
    return false;
  }
  return true;
}

/**
 * Converts pace string (MM:SS) to seconds
 */
function paceToSeconds(pace: string): number {
  const parts = pace.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Checks if a pace string is valid (MM:SS) with reasonable bounds (2:00 - 15:00 min/km)
 */
function isValidPace(pace: string): boolean {
  const pattern = /^([0-5]?\d):([0-5]\d)$/;
  if (!pattern.test(pace)) return false;

  const seconds = paceToSeconds(pace);
  // Between 2:00 (120s) and 15:00 (900s) min/km
  return seconds >= 120 && seconds <= 900;
}

/**
 * Validates interval data completeness
 */
export function validateIntervalData(values: IntervalFormValues): string[] {
  const errors: string[] = [];

  if (!isFractionneType(values.sessionType)) {
    return errors;
  }

  if (values.repetitionCount && values.repetitionCount < 1) {
    errors.push('Le nombre de répétitions doit être supérieur à 0');
  }

  if (values.effortDuration && !isValidDuration(values.effortDuration)) {
    errors.push('La durée d\'effort est invalide');
  }

  if (values.recoveryDuration && !isValidDuration(values.recoveryDuration)) {
    errors.push('La durée de récupération est invalide');
  }

  if (values.targetEffortPace && !isValidPace(values.targetEffortPace)) {
    errors.push('L\'allure d\'effort est invalide');
  }

  if (values.targetRecoveryPace && !isValidPace(values.targetRecoveryPace)) {
    errors.push('L\'allure de récupération est invalide');
  }

  return errors;
}
