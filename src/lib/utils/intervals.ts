import { type IntervalDetails, type IntervalStep } from '@/lib/types';

export function generateIntervalStructure(intervalDetails: IntervalDetails | null | undefined): string {
  if (!intervalDetails) return '';

  const {
    workoutType,
    repetitionCount,
    effortDuration,
    recoveryDuration,
  } = intervalDetails;

  if (workoutType && repetitionCount && effortDuration && recoveryDuration) {
    return `${workoutType}: ${repetitionCount}x${effortDuration} R:${recoveryDuration}`;
  }

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

  return workoutType || '';
}

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
      steps: [],
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
      steps: [],
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
      steps: [],
    };
  }

  return null;
}

function normalizeDuration(duration: string): string | null {
  if (!duration || duration.trim() === '') return null;

  const trimmed = duration.trim();

  if (trimmed.includes("'")) {
    const parts = trimmed.split("'");
    if (parts.length === 2) {
      const min = parts[0].padStart(2, '0');
      const sec = parts[1].padStart(2, '0');
      return `${min}:${sec}`;
    }
  }

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const min = parts[0].padStart(2, '0');
      const sec = parts[1].padStart(2, '0');
      return `${min}:${sec}`;
    }
  }

  const cleaned = trimmed.replace(/['"]/g, '');
  const minutes = parseInt(cleaned);
  if (!isNaN(minutes)) {
    return `${minutes.toString().padStart(2, '0')}:00`;
  }

  return null;
}

export function calculateAverageDuration(steps: IntervalStep[]): number {
  const stepsWithDuration = steps.filter(step => step.stepType !== 'warmup' && step.stepType !== 'cooldown' && step.duration);
  
  if (stepsWithDuration.length === 0) return 0;
  
  const totalSeconds = stepsWithDuration.reduce((sum, step) => {
    if (step.duration) {
      const [min, sec] = step.duration.split(':').map(Number);
      return sum + min * 60 + sec;
    }
    return sum;
  }, 0);
  
  return totalSeconds / stepsWithDuration.length;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function autoFillIntervalDurations(
  steps: IntervalStep[],
  setFormValue: (name: 'effortDuration' | 'recoveryDuration', value: string) => void
) {
  const effortSteps = steps.filter(step => step.stepType === 'effort' && step.duration);
  const recoverySteps = steps.filter(step => step.stepType === 'recovery' && step.duration);

  if (effortSteps.length > 0) {
    const avgEffortSeconds = calculateAverageDuration(effortSteps);
    setFormValue('effortDuration', formatDuration(avgEffortSeconds));
  }

  if (recoverySteps.length > 0) {
    const avgRecoverySeconds = calculateAverageDuration(recoverySteps);
    setFormValue('recoveryDuration', formatDuration(avgRecoverySeconds));
  }
}

export function getIntervalImportToastMessage(
  repetitionCount: number,
  effortSteps: IntervalStep[],
  recoverySteps: IntervalStep[]
): string {
  const avgEffortSeconds = calculateAverageDuration(effortSteps);
  const avgRecoverySeconds = calculateAverageDuration(recoverySteps);
  
  return `${repetitionCount} répétitions détectées. Durée moyenne effort: ${formatDuration(avgEffortSeconds)}, récupération: ${formatDuration(avgRecoverySeconds)}.`;
}
