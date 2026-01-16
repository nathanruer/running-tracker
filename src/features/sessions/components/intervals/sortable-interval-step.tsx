'use client';

import { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, ChevronDown } from 'lucide-react';
import { type IntervalStep } from '@/lib/types';
import { STEP_TYPE_LABELS, IntervalStepFields } from './interval-step-fields';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface SortableIntervalStepProps {
  id: string;
  index: number;
  step: IntervalStep;
  control: Control<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue?: UseFormSetValue<FormValues>;
  onRemove: (index: number) => void;
}

export function SortableIntervalStep({
  id,
  index,
  step,
  control,
  watch,
  setValue,
  onRemove,
}: SortableIntervalStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 50 : 0,
    position: isDragging ? ('relative' as const) : undefined,
  };

  const handleTypeChange = (newType: 'warmup' | 'effort' | 'recovery' | 'cooldown') => {
    if (setValue) {
      setValue(`steps.${index}.stepType`, newType);
    }
  };

  const calculateEffortNumber = (): number => {
    const currentSteps = watch('steps') || [];
    return currentSteps.filter((s, i) => s.stepType === 'effort' && i < index).length + 1;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-border/40 p-5 space-y-4 bg-background/40 ${
        isDragging ? 'shadow-xl ring-1 ring-violet-500/20 bg-background !opacity-100 z-50' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground hover:bg-muted"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95 transition-all border border-transparent hover:border-border/50"
              >
                {STEP_TYPE_LABELS[step.stepType as keyof typeof STEP_TYPE_LABELS] || step.stepType}
                {step.stepType === 'effort' && ` ${calculateEffortNumber()}`}
                <ChevronDown className="ml-1.5 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-xl border-border/50 shadow-xl overflow-hidden min-w-[140px]">
              <DropdownMenuItem className="text-xs font-medium py-2.5 focus:bg-violet-500 focus:text-white cursor-pointer" onClick={() => handleTypeChange('warmup')}>
                {STEP_TYPE_LABELS.warmup}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs font-medium py-2.5 focus:bg-violet-500 focus:text-white cursor-pointer" onClick={() => handleTypeChange('effort')}>
                {STEP_TYPE_LABELS.effort}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs font-medium py-2.5 focus:bg-violet-500 focus:text-white cursor-pointer" onClick={() => handleTypeChange('recovery')}>
                {STEP_TYPE_LABELS.recovery}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs font-medium py-2.5 focus:bg-violet-500 focus:text-white cursor-pointer" onClick={() => handleTypeChange('cooldown')}>
                {STEP_TYPE_LABELS.cooldown}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-8 w-8 rounded-xl text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/5 active:scale-95 transition-all"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <IntervalStepFields stepIndex={index} control={control} setValue={setValue} />
    </div>
  );
}
