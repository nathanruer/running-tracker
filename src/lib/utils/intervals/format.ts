import { normalizeDurationFormat } from '@/lib/utils/duration';
import { type IntervalDetails } from '@/lib/types';

/**
 * Formats duration in seconds to MM:SS (even for >= 1h)
 * Used specifically for interval steps where MM:SS is expected
 */
export function formatDurationAlwaysMMSS(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const secs = roundedSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates a human-readable interval structure string
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
