import { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ModeToggleButton } from './mode-toggle-button';
import { type IntervalFormValues } from '@/lib/validation/session-form';

interface EffortRecoverySectionProps {
  label: string;
  mode: 'duration' | 'distance';
  onModeChange: (mode: 'duration' | 'distance') => void;
  fieldPrefix: 'effort' | 'recovery';
  control: Control<IntervalFormValues>;
  showPace?: boolean;
  showHeartRate?: boolean;
}

export function EffortRecoverySection({
  label,
  mode,
  onModeChange,
  fieldPrefix,
  control,
  showPace = true,
  showHeartRate = true,
}: EffortRecoverySectionProps) {
  const durationField = `${fieldPrefix}Duration` as keyof IntervalFormValues;
  const distanceField = `${fieldPrefix}Distance` as keyof IntervalFormValues;
  const paceField = `target${fieldPrefix.charAt(0).toUpperCase() + fieldPrefix.slice(1)}Pace` as keyof IntervalFormValues;
  const hrField = `target${fieldPrefix.charAt(0).toUpperCase() + fieldPrefix.slice(1)}HR` as keyof IntervalFormValues;
  
  const hasExtraFields = showPace || showHeartRate;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</h4>
        <ModeToggleButton mode={mode} onChange={onModeChange} />
      </div>

      <div className={`grid gap-3 ${hasExtraFields ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {mode === 'duration' ? (
          <FormField
            control={control}
            name={durationField}
            render={({ field }) => (
              <FormItem className={hasExtraFields ? "" : "w-full"}>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Durée</FormLabel>
                <FormControl>
                  <Input placeholder="00:00" className="rounded-xl h-10 border-border/50 bg-[#141414]" value={(field.value as string) || ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={control}
            name={distanceField}
            render={({ field }) => (
              <FormItem className={hasExtraFields ? "" : "w-full"}>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Distance (km)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    className="rounded-xl h-10 border-border/50 bg-[#141414]"
                    value={(field.value as number) ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showPace && (
          <FormField
            control={control}
            name={paceField}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Allure cible</FormLabel>
                <FormControl>
                  <Input placeholder="00:00" className="rounded-xl h-10 border-border/50 bg-[#141414]" value={(field.value as string) || ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showHeartRate && (
          <FormField
            control={control}
            name={hrField}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">FC cible</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    className="rounded-xl h-10 border-border/50 bg-[#141414]"
                    value={(field.value as number) ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseInt(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}
