import { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type FormValues } from '@/lib/validation/session-form';

interface SessionFormFieldsProps {
  control: Control<FormValues>;
}

export function SessionFormFields({ control }: SessionFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Durée</FormLabel>
              <FormControl>
                <Input data-testid="input-duration" placeholder="00:00:00" className="rounded-xl h-10 border-border/50 bg-[#141414]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="distance"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Distance (km)</FormLabel>
              <FormControl>
                <Input
                  data-testid="input-distance"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="rounded-xl h-10 border-border/50 bg-[#141414]"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      field.onChange(null);
                    } else if (value === '-') {
                      field.onChange(value);
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        const rounded = Math.round(numValue * 100) / 100;
                        field.onChange(rounded);
                      }
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="avgPace"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Allure moy (mn/km)</FormLabel>
              <FormControl>
                <Input data-testid="input-avgpace" placeholder="00:00" className="rounded-xl h-10 border-border/50 bg-[#141414]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="avgHeartRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">FC moy (bpm)</FormLabel>
              <FormControl>
                <Input
                  data-testid="input-avgheartrate"
                  type="number"
                  placeholder="0"
                  className="rounded-xl h-10 border-border/50 bg-[#141414]"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === '' ? null : parseInt(e.target.value)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="comments"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Commentaires</FormLabel>
            <FormControl>
              <Textarea
                data-testid="input-comments"
                placeholder="Comment s'est passée votre séance ?"
                className="resize-none rounded-2xl border-border/50 min-h-[100px] bg-[#141414]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
