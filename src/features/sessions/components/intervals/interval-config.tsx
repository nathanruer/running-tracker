'use client';

import { Control } from 'react-hook-form';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { WorkoutTypeField } from './workout-type-field';
import { EffortRecoverySection } from './effort-recovery-section';

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
}

interface IntervalConfigProps {
  control: Control<FormValues>;
  isCustomType: boolean;
  onCustomTypeChange: (isCustom: boolean) => void;
}

export function IntervalConfig({ control, isCustomType, onCustomTypeChange }: IntervalConfigProps) {
  const [effortMode, setEffortMode] = useState<'time' | 'distance'>('time');
  const [recoveryMode, setRecoveryMode] = useState<'time' | 'distance'>('time');

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="workoutType"
          render={({ field }) => (
            <WorkoutTypeField
              value={field.value}
              onChange={field.onChange}
              isCustomType={isCustomType}
              onCustomTypeChange={onCustomTypeChange}
            />
          )}
        />
        <FormField
          control={control}
          name="repetitionCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de répétitions</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="0"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? null : parseInt(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <EffortRecoverySection
          label="Effort"
          mode={effortMode === 'time' ? 'duration' : 'distance'}
          onModeChange={(mode) => setEffortMode(mode === 'duration' ? 'time' : 'distance')}
          fieldPrefix="effort"
          control={control}
          showPace={false}
          showHeartRate={false}
        />
        <EffortRecoverySection
          label="Récupération"
          mode={recoveryMode === 'time' ? 'duration' : 'distance'}
          onModeChange={(mode) => setRecoveryMode(mode === 'duration' ? 'time' : 'distance')}
          fieldPrefix="recovery"
          control={control}
          showPace={false}
          showHeartRate={false}
        />
      </div>
    </>
  );
}
