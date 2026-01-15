import { type IntervalFormValues } from './form';

/**
 * Checks if a duration string is valid (MM:SS or HH:MM:SS)
 */
function isValidDuration(duration: string): boolean {
  const pattern = /^(\d{1,2}):([0-5]\d):([0-5]\d)$|^([0-5]?\d):([0-5]\d)$/;
  return pattern.test(duration);
}

/**
 * Checks if a pace string is valid (MM:SS)
 */
function isValidPace(pace: string): boolean {
  const pattern = /^([0-5]?\d):([0-5]\d)$/;
  return pattern.test(pace);
}

/**
 * Validates interval data completeness
 */
export function validateIntervalData(values: IntervalFormValues): string[] {
  const errors: string[] = [];

  if (values.sessionType !== 'Fractionné') {
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
