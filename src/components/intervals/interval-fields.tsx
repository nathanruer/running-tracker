'use client';

import { Control, UseFormWatch, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { type IntervalStep } from '@/lib/types';
import { WorkoutTypeField, WORKOUT_TYPES } from './workout-type-field';
import { EffortRecoverySection } from './effort-recovery-section';
import { STEP_TYPE_LABELS } from './interval-step-fields';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
}

interface SortableIntervalStepProps {
  id: string;
  index: number;
  step: IntervalStep;
  control: Control<FormValues>;
  onRemove: (index: number) => void;
}

function SortableIntervalStep({ id, index, step, control, onRemove }: SortableIntervalStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border border-border/50 p-4 space-y-3 bg-background/50 ${isDragging ? 'shadow-lg ring-2 ring-primary/20 bg-background' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-grab active:cursor-grabbing text-muted-foreground hover:bg-muted"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <h4 className="font-medium text-sm">
            {STEP_TYPE_LABELS[step.stepType as keyof typeof STEP_TYPE_LABELS] || step.stepType}{' '}
            {step.stepType === 'effort' && `${Math.ceil((index + 1) / 2)}`}
          </h4>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-3 pl-8">
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
  );
}

export function IntervalFields({
  control,
  onEntryModeChange,
  watch,
}: IntervalFieldsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isCustomType, setIsCustomType] = useState(false);
  const [effortMode, setEffortMode] = useState<'time' | 'distance'>('time');
  const [recoveryMode, setRecoveryMode] = useState<'time' | 'distance'>('time');
  
  const { fields, replace, move, remove } = useFieldArray({
    control,
    name: 'steps',
  });

  const repetitionCount = watch('repetitionCount') || 0;
  const currentWorkoutType = watch('workoutType');
  const prevRepetitionCount = useRef(repetitionCount);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (currentWorkoutType && !WORKOUT_TYPES.includes(currentWorkoutType)) {
      setIsCustomType(true);
    }
  }, [currentWorkoutType]);


  const effortDuration = watch('effortDuration');
  const effortDistance = watch('effortDistance');
  const recoveryDuration = watch('recoveryDuration');
  const recoveryDistance = watch('recoveryDistance');
  // We need to watch steps to get current values for updates
  const currentSteps = watch('steps') || [];

  useEffect(() => {
    // If repetition count changed, regenerate everything
    if (repetitionCount !== prevRepetitionCount.current) {
      // Only regenerate if we have a valid count
      if (repetitionCount > 0) {
        prevRepetitionCount.current = repetitionCount;
        
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
      } else {
        // If repetition count is 0 or invalid, maybe clear steps? 
        // Or just let it be.
        prevRepetitionCount.current = repetitionCount;
      }
      return;
    }

    // Determine if we should update existing steps values
    let stepsToUpdate = [...currentSteps];
    let hasChanges = false;
    
    stepsToUpdate = stepsToUpdate.map((step: IntervalStep) => {
      const updatedStep = { ...step };
      let changed = false;

      if (step.stepType === 'effort') {
        const shouldUpdateDuration = effortDuration !== undefined && effortDuration !== null && effortDuration !== '';
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
        const shouldUpdateDuration = recoveryDuration !== undefined && recoveryDuration !== null && recoveryDuration !== '';
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
  }, [
    repetitionCount,
    effortDuration,
    effortDistance,
    recoveryDuration,
    recoveryDistance,
    replace,
    onEntryModeChange,
    // currentSteps excluded from deps to avoid loop, but used inside
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onEntryModeChange('detailed');
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
    }
  };

  const handleRemove = (index: number) => {
    onEntryModeChange('detailed');
    remove(index);
  };

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

            {(repetitionCount > 0 || fields.length > 0) && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Étapes ({fields.length})
                </h4>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <SortableIntervalStep
                          key={field.id}
                          id={field.id}
                          index={index}
                          step={currentSteps[index] || field}
                          control={control}
                          onRemove={handleRemove}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
