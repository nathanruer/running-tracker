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
import { parseNullableNumberInput } from '@/lib/utils/numbers';

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
                <Input data-testid="input-duration" placeholder="00:00:00" variant="form" {...field} />
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
                  variant="form"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const parsed = parseNullableNumberInput(e.target.value, {
                      mode: 'float',
                      decimals: 2,
                      allowNegativeSign: true,
                    });
                    if (parsed !== undefined) {
                      field.onChange(parsed);
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
                <Input data-testid="input-avgpace" placeholder="00:00" variant="form" {...field} />
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
                  variant="form"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const parsed = parseNullableNumberInput(e.target.value, { mode: 'int' });
                    if (parsed !== undefined) {
                      field.onChange(parsed);
                    }
                  }}
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
                variant="form"
                className="resize-none"
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
