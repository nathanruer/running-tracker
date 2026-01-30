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
    <div className="space-y-6 rounded-2xl border border-border/50 bg-muted/20 p-5 md:p-6">
      {onCsvImport && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/10">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-foreground/90">Type de Fractionné</span>
            <span className="text-[10px] text-muted-foreground font-medium">Configurez les intervalles de votre séance</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all border border-border/20"
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
              Importer CSV
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
