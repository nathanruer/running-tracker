import { Control, UseFormSetValue } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { type IntervalFormValues } from '@/lib/validation/session-form';

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

export function IntervalStepFields({ stepIndex, control }: IntervalStepFieldsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <FormField
        control={control}
        name={`steps.${stepIndex}.duration`}
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
        name={`steps.${stepIndex}.pace`}
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
        name={`steps.${stepIndex}.hr`}
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
  );
}

export { STEP_TYPE_LABELS };
