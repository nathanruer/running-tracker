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

interface SessionTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  isCustomType: boolean;
  onCustomTypeChange: (isCustom: boolean) => void;
}

const PREDEFINED_TYPES = ['Footing', 'Sortie longue', 'Fractionné'];

export function SessionTypeSelector({
  value,
  onChange,
  isCustomType,
  onCustomTypeChange,
}: SessionTypeSelectorProps) {
  return (
    <FormItem className="flex-1">
      <FormLabel>Type de séance</FormLabel>
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
          value={value}
        >
          <FormControl>
            <SelectTrigger data-testid="select-session-type">
              <SelectValue placeholder="Sélectionnez un type" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="Footing">Footing</SelectItem>
            <SelectItem value="Sortie longue">Sortie longue</SelectItem>
            <SelectItem value="Fractionné">Fractionné</SelectItem>
            <SelectItem value="custom">Personnalisé...</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2">
          <FormControl>
            <Input data-testid="input-custom-session-type" placeholder="Type personnalisé" value={value} onChange={(e) => onChange(e.target.value)} />
          </FormControl>
          <Button
            data-testid="btn-reset-session-type"
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

export { PREDEFINED_TYPES };
