import { Control, UseFormWatch } from 'react-hook-form';
import { IntervalStepFields } from './interval-step-fields';
import { type IntervalFormValues } from '@/lib/validation/session-form';

interface IntervalStepsSectionProps {
  repetitionCount: number | null | undefined;
  control: Control<IntervalFormValues>;
  watch: UseFormWatch<IntervalFormValues>;
}

export function IntervalStepsSection({
  repetitionCount,
  control,
  watch,
}: IntervalStepsSectionProps) {
  const steps = watch('steps') || [];
  const totalSteps = steps.length;

  if (totalSteps === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Objectifs ({totalSteps} étape{totalSteps > 1 ? 's' : ''})
          {repetitionCount && repetitionCount > 1 && ` × ${repetitionCount}`}
        </h4>
      </div>

      <div className="space-y-3">
        {steps.map((_, index) => (
          <div key={index} className="rounded-lg border border-border p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Étape {index + 1}</div>
            <IntervalStepFields stepIndex={index} control={control} />
          </div>
        ))}
      </div>
    </div>
  );
}
