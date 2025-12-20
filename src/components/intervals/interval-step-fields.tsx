import { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type IntervalFormValues } from '@/lib/validation/session-form';

interface IntervalStepFieldsProps {
  stepIndex: number;
  control: Control<IntervalFormValues>;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  warmup: 'Échauffement',
  effort: 'Effort',
  recovery: 'Récupération',
  cooldown: 'Retour au calme',
};

export function IntervalStepFields({ stepIndex, control }: IntervalStepFieldsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <FormField
        control={control}
        name={`steps.${stepIndex}.stepType`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="warmup">{STEP_TYPE_LABELS.warmup}</SelectItem>
                <SelectItem value="effort">{STEP_TYPE_LABELS.effort}</SelectItem>
                <SelectItem value="recovery">{STEP_TYPE_LABELS.recovery}</SelectItem>
                <SelectItem value="cooldown">{STEP_TYPE_LABELS.cooldown}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`steps.${stepIndex}.duration`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Durée</FormLabel>
            <FormControl>
              <Input placeholder="00:05:00" {...field} value={field.value || ''} />
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
            <FormLabel>Allure</FormLabel>
            <FormControl>
              <Input placeholder="05:30" {...field} value={field.value || ''} />
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
            <FormLabel>FC</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="160"
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
  );
}

export { STEP_TYPE_LABELS };
