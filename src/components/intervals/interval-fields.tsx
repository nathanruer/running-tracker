'use client';

import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { type IntervalStep } from '@/lib/types';
import { WorkoutTypeField, WORKOUT_TYPES } from './workout-type-field';
import { EffortRecoverySection } from './effort-recovery-section';
import { STEP_TYPE_LABELS } from './interval-step-fields';

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
  steps?: IntervalStep[];
}

interface IntervalFieldsProps {
  control: Control<FormValues>;
  onEntryModeChange: (mode: 'quick' | 'detailed') => void;
  setValue: UseFormSetValue<FormValues>;
  watch: UseFormWatch<FormValues>;
}

export function IntervalFields({
  control,
  onEntryModeChange,
  setValue,
  watch,
}: IntervalFieldsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isCustomType, setIsCustomType] = useState(false);
  const [effortMode, setEffortMode] = useState<'time' | 'distance'>('time');
  const [recoveryMode, setRecoveryMode] = useState<'time' | 'distance'>('time');
  const repetitionCount = watch('repetitionCount') || 0;
  const currentWorkoutType = watch('workoutType');

  useEffect(() => {
    if (currentWorkoutType && !WORKOUT_TYPES.includes(currentWorkoutType)) {
      setIsCustomType(true);
    }
  }, [currentWorkoutType]);


  const effortDuration = watch('effortDuration');
  const effortDistance = watch('effortDistance');
  const recoveryDuration = watch('recoveryDuration');
  const recoveryDistance = watch('recoveryDistance');
  const steps = watch('steps') || [];

  useEffect(() => {
    if (repetitionCount > 0) {
      const hasRealData = steps.some((step: IntervalStep) =>
        (step.duration && step.duration !== '') ||
        (step.distance !== null && step.distance !== undefined && step.distance > 0) ||
        (step.pace && step.pace !== '') ||
        (step.hr !== null && step.hr !== undefined && step.hr > 0)
      );

      if (hasRealData) {
        let newSteps = [...steps];
        let hasChanges = false;

        newSteps = newSteps.map((step: IntervalStep) => {
          if (step.stepType === 'effort') {
            const shouldUpdateDuration = effortDuration !== undefined && effortDuration !== null && effortDuration !== '';
            const shouldUpdateDistance = effortDistance !== undefined && effortDistance !== null;

            if (shouldUpdateDuration || shouldUpdateDistance) {
              hasChanges = true;
              return {
                ...step,
                ...(shouldUpdateDuration ? { duration: effortDuration } : {}),
                ...(shouldUpdateDistance ? { distance: effortDistance } : {}),
              };
            }
          } else if (step.stepType === 'recovery') {
            const shouldUpdateDuration = recoveryDuration !== undefined && recoveryDuration !== null && recoveryDuration !== '';
            const shouldUpdateDistance = recoveryDistance !== undefined && recoveryDistance !== null;

            if (shouldUpdateDuration || shouldUpdateDistance) {
              hasChanges = true;
              return {
                ...step,
                ...(shouldUpdateDuration ? { duration: recoveryDuration } : {}),
                ...(shouldUpdateDistance ? { distance: recoveryDistance } : {}),
              };
            }
          }
          return step;
        });

        if (hasChanges) {
          setValue('steps', newSteps);
          onEntryModeChange('detailed');
        }

        return;
      }

      const expectedStepCount = 1 + repetitionCount * 2 - 1 + 1;

      let newSteps = [...steps];
      let hasChanges = false;

      if (steps.length !== expectedStepCount) {
        newSteps = [];
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

        hasChanges = true;
      } else {
        newSteps = newSteps.map((step: IntervalStep) => {
          if (step.stepType === 'effort') {
            const shouldUpdateDuration = effortDuration !== undefined && effortDuration !== null && effortDuration !== '';
            const shouldUpdateDistance = effortDistance !== undefined && effortDistance !== null;

            if (shouldUpdateDuration || shouldUpdateDistance) {
              hasChanges = true;
              return {
                ...step,
                ...(shouldUpdateDuration ? { duration: effortDuration } : {}),
                ...(shouldUpdateDistance ? { distance: effortDistance } : {}),
              };
            }
          } else if (step.stepType === 'recovery') {
            const shouldUpdateDuration = recoveryDuration !== undefined && recoveryDuration !== null && recoveryDuration !== '';
            const shouldUpdateDistance = recoveryDistance !== undefined && recoveryDistance !== null;

            if (shouldUpdateDuration || shouldUpdateDistance) {
              hasChanges = true;
              return {
                ...step,
                ...(shouldUpdateDuration ? { duration: recoveryDuration } : {}),
                ...(shouldUpdateDistance ? { distance: recoveryDistance } : {}),
              };
            }
          }
          return step;
        });
      }

      if (hasChanges) {
        setValue('steps', newSteps);
        onEntryModeChange('detailed');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    repetitionCount,
    effortDuration,
    effortDistance,
    recoveryDuration,
    recoveryDistance,
    setValue,
    onEntryModeChange,
  ]);

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="workoutType"
          render={({ field }) => (
            <WorkoutTypeField
              value={field.value}
              onChange={field.onChange}
              isCustomType={isCustomType}
              onCustomTypeChange={setIsCustomType}
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

      <div className="flex justify-start pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={`mr-2 h-4 w-4 transition-transform ${
              showDetails ? 'rotate-180' : ''
            }`}
          />
          {showDetails ? 'Masquer les détails avancés' : 'Afficher les détails avancés'}
        </Button>
      </div>

      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleContent className="space-y-6 pt-2">
          <div className="space-y-4 rounded-md bg-muted/30 p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Objectifs</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="targetEffortPace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allure cible effort (mn/km)</FormLabel>
                    <FormControl>
                      <Input placeholder="00:00" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="targetEffortHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FC cible effort (bpm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {repetitionCount > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Étapes ({watch('steps')?.length || 0})
                </h4>
                <div className="space-y-4">
                  {(watch('steps') || []).map((step: IntervalStep, index: number) => (
                    <div key={index} className="rounded-md border border-border/50 p-4 space-y-3 bg-background/50">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">
                          {STEP_TYPE_LABELS[step.stepType as keyof typeof STEP_TYPE_LABELS]}{' '}
                          {step.stepType === 'effort' && `${Math.floor(index / 2) + 1}`}
                        </h4>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <FormField
                          control={control}
                          name={`steps.${index}.duration`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Durée</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="00:00"
                                  {...field}
                                  value={field.value || ''}
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name={`steps.${index}.distance`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Dist. (km)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) =>
                                    field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                  }
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name={`steps.${index}.pace`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Allure</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="00:00"
                                  {...field}
                                  value={field.value || ''}
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name={`steps.${index}.hr`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">FC</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) =>
                                    field.onChange(e.target.value === '' ? null : parseInt(e.target.value))
                                  }
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
