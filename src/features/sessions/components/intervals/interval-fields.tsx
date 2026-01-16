'use client';

import { Control, UseFormWatch, UseFormSetValue, useFieldArray } from 'react-hook-form';
import { useState, useMemo } from 'react';
import { Watch } from 'lucide-react';
import { type IntervalStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
  onCsvImport?: (content: string) => void;
}

export function IntervalFields({
  control,
  onEntryModeChange,
  watch,
  setValue,
  disableAutoRegeneration = false,
  onCsvImport,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && onCsvImport) {
        onCsvImport(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 rounded-[2rem] border border-border/50 bg-muted/20 p-6 md:p-8">
      {onCsvImport && (
        <div className="flex items-center justify-between gap-4 mb-2">
           <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Type Fractionné</span>
             <span className="text-xs text-muted-foreground font-medium italic">Configurez vos intervalles</span>
           </div>
           <Button
             variant="secondary"
             size="sm"
              className="h-8 px-4 font-black text-[10px] uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white active:scale-95 transition-all border-none"
             asChild
           >
             <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Watch className="mr-2 h-3.5 w-3.5" />
                Garmin CSV
             </label>
           </Button>
        </div>
      )}

      <div className="pt-4 border-t border-border/40">
        <IntervalConfig
          control={control}
          isCustomType={isCustomType}
          onCustomTypeChange={setIsCustomType}
        />
      </div>

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
