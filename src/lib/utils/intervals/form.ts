import { type IntervalDetails, type IntervalStep } from '@/lib/types';

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
    stepNumber?: number;
    stepType: 'warmup' | 'effort' | 'recovery' | 'cooldown';
    duration?: string | null;
    distance?: number | null;
    pace?: string | null;
    hr?: number | null;
  }>;
}

/**
 * Transforms interval form data into IntervalDetails structure
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
        ? values.steps.map((step, index): IntervalStep => ({
            stepNumber: step.stepNumber ?? (index + 1),
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
