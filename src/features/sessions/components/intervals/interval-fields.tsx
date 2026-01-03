'use client';

import { Control, UseFormWatch, UseFormSetValue, useFieldArray } from 'react-hook-form';
import { useState, useMemo } from 'react';
import { type IntervalStep } from '@/lib/types';
import { WORKOUT_TYPES } from './workout-type-field';
import { IntervalConfig } from './interval-config';
import { IntervalStepList } from './interval-step-list';
import { useIntervalSync } from '../../hooks/intervals/use-interval-sync';

interface FormValues {
  intervalDetails?: string | null;
  workoutType?: string | null;
  repetitionCount?: number | null;
  effortDuration?: string | null;
  effortDistance?: number | null;
  recoveryDuration?: string | null;
  recoveryDistance?: number | null;
  targetEffortPace?: string | null;
  targetEffortHR?: number | null;
  targetRecoveryPace?: string | null;
  targetRecoveryHR?: number | null;
  steps?: IntervalStep[];
}

interface IntervalFieldsProps {
  control: Control<FormValues>;
  onEntryModeChange: (mode: 'quick' | 'detailed') => void;
  watch: UseFormWatch<FormValues>;
  setValue?: UseFormSetValue<FormValues>;
  disableAutoRegeneration?: boolean;
}

export function IntervalFields({
  control,
  onEntryModeChange,
  watch,
  setValue,
  disableAutoRegeneration = false,
}: IntervalFieldsProps) {
  const { fields, replace, move, remove, append } = useFieldArray({
    control,
    name: 'steps',
  });

  const currentWorkoutType = watch('workoutType');

  const derivedIsCustomType = useMemo(
    () => Boolean(currentWorkoutType && !WORKOUT_TYPES.includes(currentWorkoutType)),
    [currentWorkoutType]
  );

  const [isCustomType, setIsCustomType] = useState(derivedIsCustomType);

  useIntervalSync({ watch, replace, onEntryModeChange, disableAutoRegeneration });

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4">
      <IntervalConfig
        control={control}
        isCustomType={isCustomType}
        onCustomTypeChange={setIsCustomType}
      />

      <IntervalStepList
        control={control}
        watch={watch}
        setValue={setValue}
        fields={fields}
        onMove={move}
        onRemove={remove}
        onAppend={append}
        onEntryModeChange={onEntryModeChange}
      />
    </div>
  );
}
