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
  onChange: (value: number) => void;
}

const RPE_SCALE = [
  { value: 0, label: 'Non spécifié' },
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
}: PerceivedExertionFieldProps) {
  return (
    <FormItem className="flex-1">
      <FormLabel>RPE (1-10)</FormLabel>
      <Select
        onValueChange={(val) => onChange(parseInt(val))}
        value={value?.toString()}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Note" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
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
