import { useEffect, useRef } from 'react';
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
}

/**
 * Hook to synchronize repetition count and effort/recovery values with interval steps
 */
export function useIntervalSync({ watch, replace, onEntryModeChange }: UseIntervalSyncProps) {
  const repetitionCount = watch('repetitionCount') || 0;
  const effortDuration = watch('effortDuration');
  const effortDistance = watch('effortDistance');
  const recoveryDuration = watch('recoveryDuration');
  const recoveryDistance = watch('recoveryDistance');
  const currentSteps = watch('steps') || [];

  const prevRepetitionCount = useRef(repetitionCount);

  useEffect(() => {
    // Handle repetition count changes - regenerate all steps
    if (repetitionCount !== prevRepetitionCount.current) {
      if (repetitionCount > 0) {
        prevRepetitionCount.current = repetitionCount;

        const newSteps: IntervalStep[] = [];
        let stepNumber = 1;

        // Add warmup
        newSteps.push({
          stepNumber: stepNumber++,
          stepType: 'warmup',
          duration: '',
          distance: null,
          pace: '',
          hr: null,
        });

        // Add effort/recovery pairs
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

        // Add cooldown
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
      } else {
        prevRepetitionCount.current = repetitionCount;
      }
      return;
    }

    // Handle effort/recovery value changes - update existing steps
    let stepsToUpdate = [...currentSteps];
    let hasChanges = false;

    stepsToUpdate = stepsToUpdate.map((step: IntervalStep) => {
      const updatedStep = { ...step };
      let changed = false;

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repetitionCount, effortDuration, effortDistance, recoveryDuration, recoveryDistance, replace, onEntryModeChange]);
}
