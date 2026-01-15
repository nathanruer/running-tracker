import { Control, UseFormSetValue, useWatch } from 'react-hook-form';
import { useEffect } from 'react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { type IntervalFormValues } from '@/lib/validation/session-form';
import { calculatePaceFromDurationAndDistance } from '@/lib/utils/pace';

interface IntervalStepFieldsProps {
  stepIndex: number;
  control: Control<IntervalFormValues>;
  setValue?: UseFormSetValue<IntervalFormValues>;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  warmup: 'Échauffement',
  effort: 'Effort',
  recovery: 'Récupération',
  cooldown: 'Retour au calme',
};

export function IntervalStepFields({ stepIndex, control, setValue }: IntervalStepFieldsProps) {
  const duration = useWatch({
    control,
    name: `steps.${stepIndex}.duration`,
  });
  const distance = useWatch({
    control,
    name: `steps.${stepIndex}.distance`,
  });

  useEffect(() => {
    if (duration && distance !== null && distance !== undefined && setValue) {
      const pace = calculatePaceFromDurationAndDistance(duration, distance);
      if (pace) {
        setValue(`steps.${stepIndex}.pace`, pace, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [duration, distance, setValue, stepIndex]);

  return (
    <div className="grid grid-cols-4 gap-3">
      <FormField
        control={control}
        name={`steps.${stepIndex}.duration`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Durée (mn)</FormLabel>
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
        name={`steps.${stepIndex}.distance`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Distance (km)</FormLabel>
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
        name={`steps.${stepIndex}.pace`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Allure (mn/km)</FormLabel>
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
        name={`steps.${stepIndex}.hr`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">FC moy (bpm)</FormLabel>
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
  );
}

export { STEP_TYPE_LABELS };
