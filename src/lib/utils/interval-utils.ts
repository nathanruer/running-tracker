import { type IntervalDetails } from '@/lib/types';

/**
 * Generate a text representation of interval structure from intervalDetails
 * Examples: "VMA: 8x5'00 R:2'00", "SEUIL: 4x10'00 R:3'00"
 */
export function generateIntervalStructure(intervalDetails: IntervalDetails | null | undefined): string {
  if (!intervalDetails) return '';

  const {
    workoutType,
    repetitionCount,
    effortDuration,
    recoveryDuration,
  } = intervalDetails;

  // If we have the basic structure info, generate it
  if (workoutType && repetitionCount && effortDuration && recoveryDuration) {
    return `${workoutType}: ${repetitionCount}x${effortDuration} R:${recoveryDuration}`;
  }

  // If we have workoutType and steps, try to extract from steps
  if (workoutType && intervalDetails.steps?.length) {
    const effortSteps = intervalDetails.steps.filter(s => s.stepType === 'effort');
    const recoverySteps = intervalDetails.steps.filter(s => s.stepType === 'recovery');

    if (effortSteps.length > 0) {
      const firstEffort = effortSteps[0];
      const firstRecovery = recoverySteps[0];

      const count = effortSteps.length;
      const effortDur = firstEffort.duration || '';
      const recoveryDur = firstRecovery?.duration || '';

      if (effortDur && recoveryDur) {
        return `${workoutType}: ${count}x${effortDur} R:${recoveryDur}`;
      } else if (effortDur) {
        return `${workoutType}: ${count}x${effortDur}`;
      }
    }
  }

  // Fallback: just return workoutType if available
  return workoutType || '';
}

/**
 * Parse a simple interval structure string into basic intervalDetails
 * Example: "VMA: 8x5'00 R:2'00" -> { workoutType: "VMA", repetitionCount: 8, effortDuration: "05:00", recoveryDuration: "02:00", ... }
 */
export function parseIntervalStructure(structure: string): IntervalDetails | null {
  if (!structure || !structure.includes('x')) return null;

  // Match patterns like "VMA: 8x5'00 R:2'00" or "8x5'00/2'00"
  const pattern1 = /^([A-Z]+):\s*(\d+)x([\d']+)\s*R:([\d']+)$/i;
  const pattern2 = /^(\d+)x([\d']+)\/([\d']+)$/;
  const pattern3 = /^([A-Z]+):\s*(\d+)x([\d']+)$/i;

  let match = structure.match(pattern1);
  if (match) {
    const [, workoutType, reps, effort, recovery] = match;
    return {
      workoutType: workoutType.toUpperCase(),
      repetitionCount: parseInt(reps),
      effortDuration: normalizeDuration(effort),
      recoveryDuration: normalizeDuration(recovery),
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: null,
      targetEffortHR: null,
      targetRecoveryPace: null,
      actualEffortPace: null,
      actualEffortHR: null,
      actualRecoveryPace: null,
      steps: [],
      entryMode: 'quick',
    };
  }

  match = structure.match(pattern2);
  if (match) {
    const [, reps, effort, recovery] = match;
    return {
      workoutType: null,
      repetitionCount: parseInt(reps),
      effortDuration: normalizeDuration(effort),
      recoveryDuration: normalizeDuration(recovery),
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: null,
      targetEffortHR: null,
      targetRecoveryPace: null,
      actualEffortPace: null,
      actualEffortHR: null,
      actualRecoveryPace: null,
      steps: [],
      entryMode: 'quick',
    };
  }

  match = structure.match(pattern3);
  if (match) {
    const [, workoutType, reps, effort] = match;
    return {
      workoutType: workoutType.toUpperCase(),
      repetitionCount: parseInt(reps),
      effortDuration: normalizeDuration(effort),
      recoveryDuration: null,
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: null,
      targetEffortHR: null,
      targetRecoveryPace: null,
      actualEffortPace: null,
      actualEffortHR: null,
      actualRecoveryPace: null,
      steps: [],
      entryMode: 'quick',
    };
  }

  return null;
}

/**
 * Normalize duration from formats like "5'00" or "5'" to "05:00"
 */
function normalizeDuration(duration: string): string {
  // Remove quotes and apostrophes
  const cleaned = duration.replace(/['"]/g, '');

  // Check if already in MM:SS format
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
  }

  // Try to parse as integer minutes
  const minutes = parseInt(cleaned);
  if (!isNaN(minutes)) {
    return `${minutes.toString().padStart(2, '0')}:00`;
  }

  return cleaned;
}
