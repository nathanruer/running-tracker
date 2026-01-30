import { useEffect, useRef, useMemo } from 'react';
import { UseFormWatch, UseFieldArrayReplace } from 'react-hook-form';
import { type IntervalStep } from '@/lib/types';

interface FormValues {
  repetitionCount?: number | null;
  effortDuration?: string | null;
  effortDistance?: number | null;
  recoveryDuration?: string | null;
  recoveryDistance?: number | null;
  steps?: IntervalStep[];
}

interface UseIntervalSyncProps {
  watch: UseFormWatch<FormValues>;
  replace: UseFieldArrayReplace<FormValues, 'steps'>;
  onEntryModeChange: (mode: 'quick' | 'detailed') => void;
  disableAutoRegeneration?: boolean;
}

const EMPTY_STEPS: IntervalStep[] = [];

/**
 * Hook to synchronize repetition count and effort/recovery values with interval steps
 */
export function useIntervalSync({ watch, replace, onEntryModeChange, disableAutoRegeneration = false }: UseIntervalSyncProps) {
  const repetitionCount = watch('repetitionCount') || 0;
  const effortDuration = watch('effortDuration');
  const effortDistance = watch('effortDistance');
  const recoveryDuration = watch('recoveryDuration');
  const recoveryDistance = watch('recoveryDistance');
  const watchedSteps = watch('steps');
  const currentSteps = useMemo(() => watchedSteps ?? EMPTY_STEPS, [watchedSteps]);

  const prevRepetitionCount = useRef(repetitionCount);

  useEffect(() => {
    if (repetitionCount !== prevRepetitionCount.current) {
      if (repetitionCount > 0) {
        prevRepetitionCount.current = repetitionCount;

        if (disableAutoRegeneration) {
          return;
        }

        const hasDetailedData = currentSteps.some(
          (step: IntervalStep) =>
            (step.pace && step.pace !== '') || (step.hr !== null && step.hr !== undefined)
        );

        if (currentSteps.length === 0 && !hasDetailedData) {
          const newSteps: IntervalStep[] = [];
          let stepNumber = 1;

          newSteps.push({
            stepNumber: stepNumber++,
            stepType: 'warmup',
            duration: '',
            distance: null,
            pace: '',
            hr: null,
          });

          for (let i = 0; i < repetitionCount; i++) {
            newSteps.push({
              stepNumber: stepNumber++,
              stepType: 'effort',
              duration: effortDuration || '',
              distance: effortDistance || null,
              pace: '',
              hr: null,
            });

            if (i < repetitionCount - 1) {
              newSteps.push({
                stepNumber: stepNumber++,
                stepType: 'recovery',
                duration: recoveryDuration || '',
                distance: recoveryDistance || null,
                pace: '',
                hr: null,
              });
            }
          }

          newSteps.push({
            stepNumber: stepNumber++,
            stepType: 'cooldown',
            duration: '',
            distance: null,
            pace: '',
            hr: null,
          });

          replace(newSteps);
          onEntryModeChange('detailed');
          return;
        }

        if (currentSteps.length > 0) {
          const currentEffortCount = currentSteps.filter(s => s.stepType === 'effort').length;

          if (currentEffortCount !== repetitionCount) {
            let updatedSteps = [...currentSteps];

            if (repetitionCount > currentEffortCount) {
              const cooldownIndex = updatedSteps.findIndex(s => s.stepType === 'cooldown');
              const insertIndex = cooldownIndex >= 0 ? cooldownIndex : updatedSteps.length;

              const lastEffortIndex = updatedSteps.map((s, i) => s.stepType === 'effort' ? i : -1)
                .filter(i => i >= 0)
                .pop();

              if (lastEffortIndex !== undefined && lastEffortIndex >= 0) {
                const hasRecoveryAfterLastEffort =
                  lastEffortIndex + 1 < updatedSteps.length &&
                  updatedSteps[lastEffortIndex + 1].stepType === 'recovery';

                if (!hasRecoveryAfterLastEffort) {
                  updatedSteps.splice(insertIndex, 0, {
                    stepNumber: 0,
                    stepType: 'recovery',
                    duration: recoveryDuration || '',
                    distance: recoveryDistance || null,
                    pace: '',
                    hr: null,
                  });
                }
              }

              const effortsToAdd = repetitionCount - currentEffortCount;
              for (let i = 0; i < effortsToAdd; i++) {
                const isLast = i === effortsToAdd - 1;
                const newInsertIndex = updatedSteps.findIndex(s => s.stepType === 'cooldown');
                const actualInsertIndex = newInsertIndex >= 0 ? newInsertIndex : updatedSteps.length;

                updatedSteps.splice(actualInsertIndex, 0, {
                  stepNumber: 0,
                  stepType: 'effort',
                  duration: effortDuration || '',
                  distance: effortDistance || null,
                  pace: '',
                  hr: null,
                });

                if (!isLast) {
                  updatedSteps.splice(actualInsertIndex + 1, 0, {
                    stepNumber: 0,
                    stepType: 'recovery',
                    duration: recoveryDuration || '',
                    distance: recoveryDistance || null,
                    pace: '',
                    hr: null,
                  });
                }
              }
            } else {
              const effortsToRemove = currentEffortCount - repetitionCount;

              const effortIndices = updatedSteps
                .map((s, i) => s.stepType === 'effort' ? i : -1)
                .filter(i => i >= 0);

              const indicesToRemove: number[] = [];
              for (let i = 0; i < effortsToRemove; i++) {
                const effortIndex = effortIndices[effortIndices.length - 1 - i];
                if (effortIndex !== undefined) {
                  indicesToRemove.push(effortIndex);

                  if (effortIndex > 0 && updatedSteps[effortIndex - 1].stepType === 'recovery') {
                    indicesToRemove.push(effortIndex - 1);
                  }
                }
              }

              indicesToRemove.sort((a, b) => b - a).forEach(index => {
                updatedSteps.splice(index, 1);
              });

              const newLastEffortIndex = updatedSteps
                .map((s, i) => s.stepType === 'effort' ? i : -1)
                .filter(i => i >= 0)
                .pop();

              if (newLastEffortIndex !== undefined &&
                  newLastEffortIndex + 1 < updatedSteps.length &&
                  updatedSteps[newLastEffortIndex + 1].stepType === 'recovery') {
                updatedSteps.splice(newLastEffortIndex + 1, 1);
              }
            }

            updatedSteps = updatedSteps.map((step, index) => ({
              ...step,
              stepNumber: index + 1,
            }));

            replace(updatedSteps);
            onEntryModeChange('detailed');
            return;
          }
        }
      } else {
        prevRepetitionCount.current = repetitionCount;
      }
      return;
    }

    let stepsToUpdate = [...currentSteps];
    let hasChanges = false;

    stepsToUpdate = stepsToUpdate.map((step: IntervalStep) => {
      const updatedStep = { ...step };
      let changed = false;

      const hasDetailedData =
        (step.pace && step.pace !== '') ||
        (step.hr !== null && step.hr !== undefined);

      if (hasDetailedData) {
        return step;
      }

      if (step.stepType === 'effort') {
        const shouldUpdateDuration =
          effortDuration !== undefined && effortDuration !== null && effortDuration !== '';
        const shouldUpdateDistance = effortDistance !== undefined && effortDistance !== null;

        if (shouldUpdateDuration && step.duration !== effortDuration) {
          updatedStep.duration = effortDuration;
          changed = true;
        }
        if (shouldUpdateDistance && step.distance !== effortDistance) {
          updatedStep.distance = effortDistance;
          changed = true;
        }
      } else if (step.stepType === 'recovery') {
        const shouldUpdateDuration =
          recoveryDuration !== undefined && recoveryDuration !== null && recoveryDuration !== '';
        const shouldUpdateDistance = recoveryDistance !== undefined && recoveryDistance !== null;

        if (shouldUpdateDuration && step.duration !== recoveryDuration) {
          updatedStep.duration = recoveryDuration;
          changed = true;
        }
        if (shouldUpdateDistance && step.distance !== recoveryDistance) {
          updatedStep.distance = recoveryDistance;
          changed = true;
        }
      }

      if (changed) hasChanges = true;
      return updatedStep;
    });

    if (hasChanges) {
      replace(stepsToUpdate);
      onEntryModeChange('detailed');
    }

  }, [repetitionCount, effortDuration, effortDistance, recoveryDuration, recoveryDistance, replace, onEntryModeChange, currentSteps, disableAutoRegeneration]);
}
