import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PerceivedExertionFieldProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  label?: string;
}

const RPE_SCALE = [
  { value: 1, label: '1 - Très facile' },
  { value: 2, label: '2 - Facile' },
  { value: 3, label: '3 - Modéré' },
  { value: 4, label: '4 - Un peu difficile' },
  { value: 5, label: '5 - Difficile' },
  { value: 6, label: '6 - Très difficile' },
  { value: 7, label: '7 - Extrêmement difficile' },
  { value: 8, label: '8 - Épuisant' },
  { value: 9, label: '9 - Presque maximal' },
  { value: 10, label: '10 - Maximal' },
];

export function PerceivedExertionField({
  value,
  onChange,
  label = 'RPE (Effort)',
}: PerceivedExertionFieldProps) {
  return (
    <FormItem className="flex-1">
      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</FormLabel>
      <Select
        onValueChange={(val) => {
          const numVal = parseInt(val);
          onChange(numVal === -1 ? null : numVal);
        }}
        value={value ? value.toString() : undefined}
      >
        <FormControl>
          <SelectTrigger data-testid="select-rpe" variant="form">
            <SelectValue placeholder="Note" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="-1" className="text-muted-foreground italic">
            Pas de note
          </SelectItem>
          {RPE_SCALE.map((item) => (
            <SelectItem key={item.value} value={item.value.toString()}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );
}
