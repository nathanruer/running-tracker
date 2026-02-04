import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FormControl,
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

interface WorkoutTypeFieldProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  isCustomType: boolean;
  onCustomTypeChange: (isCustom: boolean) => void;
}

const WORKOUT_TYPES = [
  'TEMPO',
  'SEUIL',
  'VMA',
];

export function WorkoutTypeField({
  value,
  onChange,
  isCustomType,
  onCustomTypeChange,
}: WorkoutTypeFieldProps) {
  return (
    <FormItem>
      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Type de séance</FormLabel>
      {!isCustomType ? (
        <Select
          onValueChange={(newValue) => {
            if (newValue === 'custom') {
              onCustomTypeChange(true);
              onChange('');
            } else {
              onChange(newValue);
            }
          }}
          value={value || ''}
        >
          <FormControl>
            <SelectTrigger variant="form">
              <SelectValue placeholder="Type de fractionné" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {WORKOUT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
            <SelectItem value="custom">Personnalisé...</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2">
          <FormControl>
            <Input
              placeholder="Type personnalisé"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              variant="form"
            />
          </FormControl>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onCustomTypeChange(false);
              onChange('');
            }}
            className="h-10 px-3"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
}

export { WORKOUT_TYPES };
