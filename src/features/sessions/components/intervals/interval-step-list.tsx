'use client';

import { Control, UseFormWatch, UseFormSetValue, FieldArrayWithId } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { type IntervalStep } from '@/lib/types';
import { SortableIntervalStep } from './sortable-interval-step';
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
} from '@dnd-kit/sortable';

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

interface IntervalStepListProps {
  control: Control<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue?: UseFormSetValue<FormValues>;
  fields: FieldArrayWithId<FormValues, 'steps', 'id'>[];
  onMove: (oldIndex: number, newIndex: number) => void;
  onRemove: (index: number) => void;
  onAppend: (step: IntervalStep) => void;
  onEntryModeChange: (mode: 'quick' | 'detailed') => void;
}

export function IntervalStepList({
  control,
  watch,
  setValue,
  fields,
  onMove,
  onRemove,
  onAppend,
  onEntryModeChange,
}: IntervalStepListProps) {
  const [showDetails, setShowDetails] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const currentSteps = watch('steps') || [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onEntryModeChange('detailed');
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      onMove(oldIndex, newIndex);
    }
  };

  const handleRemove = (index: number) => {
    onEntryModeChange('detailed');
    onRemove(index);
  };

  const handleAddManualInterval = () => {
    onEntryModeChange('detailed');

    const nextStepNumber =
      currentSteps.length > 0 ? Math.max(...currentSteps.map((step) => step.stepNumber || 0)) + 1 : 1;

    const newStep: IntervalStep = {
      stepNumber: nextStepNumber,
      stepType: 'warmup',
      duration: '',
      distance: null,
      pace: '',
      hr: null,
    };

    onAppend(newStep);
  };

  return (
    <>
      <div className="flex justify-start pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground/80 hover:bg-muted transition-all rounded-xl"
        >
          <ChevronDown
            className={`mr-2 h-3.5 w-3.5 transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`}
          />
          {showDetails ? 'Masquer les détails' : 'Détails avancés'}
        </Button>
      </div>

      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleContent className="space-y-6 pt-4">
          <div className="space-y-6 rounded-2xl bg-muted/30 p-6 border border-border/40">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Objectifs de séance</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="targetEffortPace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Allure cible effort</FormLabel>
                      <FormControl>
                        <Input placeholder="00:00" className="rounded-xl h-10 border-border/50 bg-[#141414]" {...field} value={field.value || ''} />
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
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">FC cible effort</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          className="rounded-xl h-10 border-border/50 bg-[#141414]"
                          {...field}
                          value={field.value || ''}
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
            </div>

            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                  Étapes détaillée ({fields.length})
                </h4>
                <Button
                  data-testid="btn-add-interval-step"
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleAddManualInterval}
                  className="h-8 w-8 rounded-xl text-muted-foreground/40 hover:text-violet-600 hover:bg-violet-500/5 transition-all"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {fields.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <SortableIntervalStep
                          key={field.id}
                          id={field.id}
                          index={index}
                          step={currentSteps[index] || field}
                          control={control}
                          watch={watch}
                          setValue={setValue}
                          onRemove={handleRemove}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>Aucun intervalle pour le moment</p>
                  <p className="mt-1">
                    Cliquez sur le bouton + pour ajouter un intervalle manuellement
                  </p>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
