import { type IntervalDetails, type IntervalStep } from '@/lib/types';
import { parseDuration, normalizeDurationToMMSS, normalizeDurationFormat } from './duration';

export interface IntervalFormValues {
  sessionType: string;
  workoutType?: string | null;
  repetitionCount?: number | null;
  effortDuration?: string | null;
  recoveryDuration?: string | null;
  effortDistance?: number | null;
  recoveryDistance?: number | null;
  targetEffortPace?: string | null;
  targetEffortHR?: number | null;
  targetRecoveryPace?: string | null;
  steps?: Array<{
    stepNumber: number;
    stepType: 'warmup' | 'effort' | 'recovery' | 'cooldown';
    duration?: string | null;
    distance?: number | null;
    pace?: string | null;
    hr?: number | null;
  }>;
}

// ============================================================================
// STRING PARSING & GENERATION
// ============================================================================

/**
 * Generates a human-readable interval structure string
 * @param intervalDetails Interval details object
 * @returns Formatted string like "VMA: 8x5'00 R:2'00"
 * @example generateIntervalStructure({ workoutType: 'VMA', repetitionCount: 8, ... }) // "VMA: 8x5'00 R:2'00"
 */
export function generateIntervalStructure(intervalDetails: IntervalDetails | null | undefined): string {
  if (!intervalDetails) return '';

  const {
    workoutType,
    repetitionCount,
    effortDuration,
    recoveryDuration,
  } = intervalDetails;

  // Helper to format duration smartly (MM:SS when < 1h, HH:MM:SS when >= 1h)
  const formatDur = (dur: string | null | undefined): string => {
    if (!dur) return '';
    return normalizeDurationFormat(dur) || dur;
  };

  if (workoutType && repetitionCount && effortDuration && recoveryDuration) {
    const formattedEffort = formatDur(effortDuration);
    const formattedRecovery = formatDur(recoveryDuration);
    return `${workoutType}: ${repetitionCount}x${formattedEffort} R:${formattedRecovery}`;
  }

  if (workoutType && intervalDetails.steps?.length) {
    const effortSteps = intervalDetails.steps.filter(s => s.stepType === 'effort');
    const recoverySteps = intervalDetails.steps.filter(s => s.stepType === 'recovery');

    if (effortSteps.length > 0) {
      const firstEffort = effortSteps[0];
      const firstRecovery = recoverySteps[0];

      const count = effortSteps.length;
      const effortDur = formatDur(firstEffort.duration);
      const recoveryDur = formatDur(firstRecovery?.duration);

      if (effortDur && recoveryDur) {
        return `${workoutType}: ${count}x${effortDur} R:${recoveryDur}`;
      } else if (effortDur) {
        return `${workoutType}: ${count}x${effortDur}`;
      }
    }
  }

  return workoutType || '';
}

/**
 * Parses an interval structure string into IntervalDetails
 * @param structure String like "VMA: 8x5'00 R:2'00" or "8x5'00/2'00"
 * @returns Parsed IntervalDetails or null if invalid
 * @example parseIntervalStructure("VMA: 8x5'00 R:2'00") // { workoutType: 'VMA', repetitionCount: 8, ... }
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
      effortDuration: normalizeDurationToMMSS(effort),
      recoveryDuration: normalizeDurationToMMSS(recovery),
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: null,
      targetEffortHR: null,
      targetRecoveryPace: null,
      steps: [],
    };
  }

  match = structure.match(pattern2);
  if (match) {
    const [, reps, effort, recovery] = match;
    return {
      workoutType: null,
      repetitionCount: parseInt(reps),
      effortDuration: normalizeDurationToMMSS(effort),
      recoveryDuration: normalizeDurationToMMSS(recovery),
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: null,
      targetEffortHR: null,
      targetRecoveryPace: null,
      steps: [],
    };
  }

  match = structure.match(pattern3);
  if (match) {
    const [, workoutType, reps, effort] = match;
    return {
      workoutType: workoutType.toUpperCase(),
      repetitionCount: parseInt(reps),
      effortDuration: normalizeDurationToMMSS(effort),
      recoveryDuration: null,
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: null,
      targetEffortHR: null,
      targetRecoveryPace: null,
      steps: [],
    };
  }

  return null;
}

// ============================================================================
// FORM TRANSFORMATION
// ============================================================================

/**
 * Transforms interval form data into IntervalDetails structure
 * Only returns interval details if sessionType is 'Fractionné' and has interval data
 *
 * @param values Form values containing interval data
 * @param entryMode Entry mode ('quick' or 'detailed')
 * @returns IntervalDetails or null if not applicable
 *
 * @example
 * const intervalDetails = transformIntervalData(formValues, 'detailed');
 * if (intervalDetails) {
 *   // Save to database
 * }
 */
export function transformIntervalData(
  values: IntervalFormValues,
  entryMode: 'quick' | 'detailed' = 'quick'
): IntervalDetails | null {
  if (values.sessionType !== 'Fractionné') {
    return null;
  }

  const hasIntervalDataValue =
    values.workoutType ||
    values.repetitionCount ||
    values.targetEffortPace ||
    values.targetEffortHR ||
    values.targetRecoveryPace ||
    values.recoveryDistance;

  if (!hasIntervalDataValue) {
    return null;
  }

  return {
    workoutType: values.workoutType || null,
    repetitionCount: values.repetitionCount ?? null,
    effortDuration: values.effortDuration || null,
    recoveryDuration: values.recoveryDuration || null,
    effortDistance: values.effortDistance ?? null,
    recoveryDistance: values.recoveryDistance ?? null,
    targetEffortPace: values.targetEffortPace || null,
    targetEffortHR: values.targetEffortHR ?? null,
    targetRecoveryPace: values.targetRecoveryPace || null,
    steps:
      entryMode === 'detailed' && values.steps
        ? values.steps.map((step): IntervalStep => ({
            stepNumber: step.stepNumber,
            stepType: step.stepType,
            duration: step.duration || null,
            distance: step.distance ?? null,
            pace: step.pace || null,
            hr: step.hr ?? null,
          }))
        : [],
  };
}

/**
 * Checks if form values contain interval data
 * Useful for conditional rendering or validation
 *
 * @param values Form values to check
 * @returns True if interval data is present
 */
export function hasIntervalData(values: IntervalFormValues): boolean {
  return (
    values.sessionType === 'Fractionné' &&
    (!!values.workoutType ||
      !!values.repetitionCount ||
      !!values.targetEffortPace ||
      !!values.targetEffortHR ||
      !!values.targetRecoveryPace ||
      !!values.recoveryDistance ||
      (!!values.steps && values.steps.length > 0))
  );
}

/**
 * Creates default interval form values
 * Useful for initializing forms
 *
 * @returns Default interval form values
 */
export function getDefaultIntervalValues(): Partial<IntervalFormValues> {
  return {
    workoutType: '',
    repetitionCount: undefined,
    effortDuration: '',
    recoveryDuration: '',
    effortDistance: undefined,
    recoveryDistance: undefined,
    targetEffortPace: '',
    targetEffortHR: undefined,
    targetRecoveryPace: '',
    steps: [],
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates interval data completeness
 * Returns validation errors if data is incomplete
 *
 * @param values Form values to validate
 * @returns Array of validation error messages
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

/**
 * Checks if a duration string is valid (MM:SS or HH:MM:SS)
 * @param duration Duration string to validate
 * @returns True if valid
 * @private
 */
function isValidDuration(duration: string): boolean {
  const pattern = /^(\d{1,2}):([0-5]\d):([0-5]\d)$|^([0-5]?\d):([0-5]\d)$/;
  return pattern.test(duration);
}

/**
 * Checks if a pace string is valid (MM:SS)
 * @param pace Pace string to validate
 * @returns True if valid
 * @private
 */
function isValidPace(pace: string): boolean {
  const pattern = /^([0-5]?\d):([0-5]\d)$/;
  return pattern.test(pace);
}

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculates average duration from interval steps
 * @param steps Array of interval steps
 * @returns Average duration in seconds
 */
export function calculateAverageDuration(steps: IntervalStep[]): number {
  const stepsWithDuration = steps.filter(step => step.stepType !== 'warmup' && step.stepType !== 'cooldown' && step.duration);

  if (stepsWithDuration.length === 0) return 0;

  const totalSeconds = stepsWithDuration.reduce((sum, step) => {
    const seconds = parseDuration(step.duration);
    return sum + (seconds || 0);
  }, 0);

  return totalSeconds / stepsWithDuration.length;
}

/**
 * Formats duration in seconds to MM:SS (even for >= 1h)
 * Used specifically for interval steps where MM:SS is expected
 * 
 * @param seconds Duration in seconds
 * @returns Formatted duration string always in MM:SS format
 * 
 * @example
 * formatDurationAlwaysMMSS(125)   // "02:05"
 * formatDurationAlwaysMMSS(3700)  // "61:40" (> 1h but still MM:SS)
 */
export function formatDurationAlwaysMMSS(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const secs = roundedSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Auto-fills interval durations based on step averages
 * @param steps Array of interval steps
 * @param setFormValue Function to set form values
 */
export function autoFillIntervalDurations(
  steps: IntervalStep[],
  setFormValue: (name: 'effortDuration' | 'recoveryDuration', value: string) => void
) {
  const effortSteps = steps.filter(step => step.stepType === 'effort' && step.duration);
  const recoverySteps = steps.filter(step => step.stepType === 'recovery' && step.duration);

  if (effortSteps.length > 0) {
    const avgEffortSeconds = calculateAverageDuration(effortSteps);
    setFormValue('effortDuration', formatDurationAlwaysMMSS(avgEffortSeconds));
  }

  if (recoverySteps.length > 0) {
    const avgRecoverySeconds = calculateAverageDuration(recoverySteps);
    setFormValue('recoveryDuration', formatDurationAlwaysMMSS(avgRecoverySeconds));
  }
}

/**
 * Generates toast message for interval import
 * @param repetitionCount Number of repetitions
 * @param effortSteps Effort steps
 * @param recoverySteps Recovery steps
 * @returns Toast message string
 */
export function getIntervalImportToastMessage(
  repetitionCount: number,
  effortSteps: IntervalStep[],
  recoverySteps: IntervalStep[]
): string {
  const avgEffortSeconds = calculateAverageDuration(effortSteps);
  const avgRecoverySeconds = calculateAverageDuration(recoverySteps);

  return `${repetitionCount} répétitions détectées. Durée moyenne effort: ${formatDurationAlwaysMMSS(avgEffortSeconds)}, récupération: ${formatDurationAlwaysMMSS(avgRecoverySeconds)}.`;
}
