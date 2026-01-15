/**
 * Interval step utilities for filtering, labeling, and grouping
 */

import { type IntervalStep, type StepType } from '@/lib/types';

export type StepTypeFilter = 'all' | StepType;

/**
 * Filter steps by type
 */
export function filterStepsByType(
  steps: IntervalStep[],
  type: StepTypeFilter
): IntervalStep[] {
  if (type === 'all') return steps;
  return steps.filter((step) => step.stepType === type);
}

/**
 * Filter steps that have a specific property with a valid value
 */
export function filterStepsWithProperty<K extends keyof IntervalStep>(
  steps: IntervalStep[],
  property: K
): IntervalStep[] {
  return steps.filter((step) => {
    const value = step[property];
    if (value == null) return false;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
  });
}

/**
 * Filter steps excluding warmup and cooldown
 */
export function filterWorkSteps(steps: IntervalStep[]): IntervalStep[] {
  return steps.filter(
    (step) => step.stepType !== 'warmup' && step.stepType !== 'cooldown'
  );
}

/**
 * Group steps by type
 */
export function groupStepsByType(steps: IntervalStep[]): Record<StepType, IntervalStep[]> {
  const groups: Record<StepType, IntervalStep[]> = {
    warmup: [],
    effort: [],
    recovery: [],
    cooldown: [],
  };

  for (const step of steps) {
    if (step.stepType in groups) {
      groups[step.stepType].push(step);
    }
  }

  return groups;
}

/**
 * Get the index of a step within its type group
 */
export function getStepIndexInType(step: IntervalStep, steps: IntervalStep[]): number {
  const typeSteps = filterStepsByType(steps, step.stepType);
  return typeSteps.indexOf(step);
}

/**
 * Generate a display label for a step
 */
export function getStepLabel(
  step: IntervalStep,
  indexWithinType: number,
  locale: 'fr' | 'en' = 'fr'
): string {
  const labels = {
    fr: {
      warmup: 'Échauf.',
      cooldown: 'Retour',
      effort: 'E',
      recovery: 'R',
    },
    en: {
      warmup: 'Warmup',
      cooldown: 'Cooldown',
      effort: 'E',
      recovery: 'R',
    },
  };

  const typeLabels = labels[locale];

  switch (step.stepType) {
    case 'warmup':
      return typeLabels.warmup;
    case 'cooldown':
      return typeLabels.cooldown;
    case 'effort':
      return `${typeLabels.effort}${indexWithinType + 1}`;
    case 'recovery':
      return `${typeLabels.recovery}${indexWithinType + 1}`;
    default:
      return step.stepType;
  }
}

/**
 * Generate a display label for a step (convenience function that finds index automatically)
 */
export function getStepLabelAuto(
  step: IntervalStep,
  allSteps: IntervalStep[],
  locale: 'fr' | 'en' = 'fr'
): string {
  const index = getStepIndexInType(step, allSteps);
  return getStepLabel(step, index, locale);
}

/**
 * Get color class for a step type
 */
export function getStepColor(stepType: StepType): string {
  const colors: Record<StepType, string> = {
    warmup: 'bg-blue-500/80',
    effort: 'bg-red-500/80',
    recovery: 'bg-green-500/80',
    cooldown: 'bg-purple-500/80',
  };

  return colors[stepType] || 'bg-gray-500/80';
}

/**
 * Get text color class for a step type
 */
export function getStepTextColor(stepType: StepType): string {
  const colors: Record<StepType, string> = {
    warmup: 'text-blue-500',
    effort: 'text-red-500',
    recovery: 'text-green-500',
    cooldown: 'text-purple-500',
  };

  return colors[stepType] || 'text-gray-500';
}

/**
 * Count steps by type
 */
export function countStepsByType(steps: IntervalStep[]): Record<StepType, number> {
  const counts: Record<StepType, number> = {
    warmup: 0,
    effort: 0,
    recovery: 0,
    cooldown: 0,
  };

  for (const step of steps) {
    if (step.stepType in counts) {
      counts[step.stepType]++;
    }
  }

  return counts;
}

/**
 * Cleans interval steps by removing redundant recovery steps
 * Rule: Remove 'recovery' if it is the last step OR immediately followed by 'cooldown'
 */
export function cleanIntervalSteps(steps: IntervalStep[]): IntervalStep[] {
  if (!steps?.length) return [];
  
  return steps.filter((step, index, arr) => {
    if (step.stepType === 'recovery') {
      const nextStep = arr[index + 1];
      if (!nextStep) return false; 
      if (nextStep.stepType === 'cooldown') return false;
    }
    return true;
  });
}
