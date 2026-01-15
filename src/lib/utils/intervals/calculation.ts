import { type IntervalDetails, type IntervalStep } from '@/lib/types';
import { parseDuration } from '@/lib/utils/duration';
import { estimateEffectiveDistance } from '@/lib/utils/distance';
import { extractStepHR } from '@/lib/utils/heart-rate';
import { filterStepsWithProperty, filterWorkSteps, cleanIntervalSteps } from './steps';
import { formatDurationAlwaysMMSS } from './format';

export interface IntervalTotals {
  totalDurationMin: number;
  totalDistanceKm: number;
  avgPaceSec: number | null;
  avgPaceFormatted: string | null;
  avgBpm: number | null;
  isEstimated: boolean;
}

/**
 * Calculates average duration from interval steps
 */
export function calculateAverageDuration(steps: IntervalStep[]): number {
  // Filter work steps (excluding warmup/cooldown) that have duration
  const workSteps = filterWorkSteps(steps);
  const stepsWithDuration = filterStepsWithProperty(workSteps, 'duration');

  if (stepsWithDuration.length === 0) return 0;

  const totalSeconds = stepsWithDuration.reduce((sum, step) => {
    const seconds = parseDuration(step.duration);
    return sum + (seconds || 0);
  }, 0);

  return totalSeconds / stepsWithDuration.length;
}

/**
 * Extracts average effort pace from interval details
 */
export function getEffortPace(details: IntervalDetails | null): string | null {
  if (!details?.steps || !Array.isArray(details.steps)) return null;
  
  interface LooseStep {
    stepType?: string;
    type?: string;
    pace?: string;
    allure?: string;
    target?: { pace?: string };
  }

  const efforts = details.steps.filter(s => {
    const ls = s as unknown as LooseStep;
    return s.stepType === 'effort' || 
           ls.stepType === 'work' || 
           ls.type === 'work' || 
           ls.type === 'Effort';
  });

  if (efforts.length === 0) return null;

  const pToS = (p: string) => {
    const parts = p.split(':').map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
  };

  let totalPaceSec = 0;
  let count = 0;

  for (const e of efforts) {
      const ls = e as unknown as LooseStep;
      const paceStr = ls.pace || ls.allure || ls.target?.pace; 
      if (paceStr && typeof paceStr === 'string' && paceStr.includes(':')) {
          const s = pToS(paceStr);
          if (s > 0) {
              totalPaceSec += s;
              count++;
          }
      }
  }

  if (count === 0) return null;
  const avgPaceSec = totalPaceSec / count;
  
  return formatDurationAlwaysMMSS(avgPaceSec);
}

/**
 * Calculates global totals for an interval session (Duration, Distance, Pace, HR)
 */
export function calculateIntervalTotals(rawSteps: IntervalStep[] | undefined | null): IntervalTotals {
  const steps = cleanIntervalSteps(rawSteps || []);
  
  if (!steps.length) {
    return { totalDurationMin: 0, totalDistanceKm: 0, avgPaceSec: null, avgPaceFormatted: null, avgBpm: null, isEstimated: false };
  }

  let totalSeconds = 0;
  let totalDistance = 0;
  let totalWeightedHR = 0;
  let hrSeconds = 0;
  let hasEstimations = false;

  let totalWeightedPaceSec = 0;
  let totalDistanceForPace = 0;

  steps.forEach(step => {
    const durationSec = parseDuration(step.duration) || 0;
    const stepPaceSec = parseDuration(step.pace);
    const stepDistanceRaw = Number(step.distance) || 0;

    if (durationSec > 0) {
      const distanceResult = estimateEffectiveDistance(
        durationSec,
        stepPaceSec,
        stepDistanceRaw > 0 ? stepDistanceRaw : null
      );

      if (distanceResult.isEstimated) {
        hasEstimations = true;
      }

      const stepDistance = distanceResult.distance;
      totalSeconds += durationSec;
      totalDistance += stepDistance;

      const paceToWeight = stepPaceSec || (stepDistance > 0 ? durationSec / stepDistance : null);
      if (paceToWeight && stepDistance > 0) {
        totalWeightedPaceSec += paceToWeight * stepDistance;
        totalDistanceForPace += stepDistance;
      }

      const hrValue = extractStepHR(step);

      if (hrValue) {
        totalWeightedHR += hrValue * durationSec;
        hrSeconds += durationSec;
      }
    }
  });

  const avgPaceSec = totalDistanceForPace > 0 ? totalWeightedPaceSec / totalDistanceForPace : null;
  const avgBpm = hrSeconds > 0 ? Math.round(totalWeightedHR / hrSeconds) : null;

  let avgPaceFormatted = null;
  if (avgPaceSec) {
    const rounded = Math.round(avgPaceSec);
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
    avgPaceFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return {
    totalDurationMin: totalSeconds / 60,
    totalDistanceKm: Number(totalDistance.toFixed(2)),
    avgPaceSec,
    avgPaceFormatted,
    avgBpm,
    isEstimated: hasEstimations
  };
}

/**
 * Auto-fills interval durations based on step averages
 */
export function autoFillIntervalDurations(
  steps: IntervalStep[],
  setFormValue: (name: 'effortDuration' | 'recoveryDuration', value: string) => void
) {
  const effortSteps = filterStepsWithProperty(
    steps.filter(step => step.stepType === 'effort'),
    'duration'
  );
  const recoverySteps = filterStepsWithProperty(
    steps.filter(step => step.stepType === 'recovery'),
    'duration'
  );

  if (effortSteps.length > 0) {
    const avgEffortSeconds = calculateAverageDuration(effortSteps);
    setFormValue('effortDuration', formatDurationAlwaysMMSS(avgEffortSeconds));
  }

  if (recoverySteps.length > 0) {
    const avgRecoverySeconds = calculateAverageDuration(recoverySteps);
    setFormValue('recoveryDuration', formatDurationAlwaysMMSS(avgRecoverySeconds));
  }
}
