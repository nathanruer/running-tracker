import { X } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface CustomTypeSelectorProps {
  label: string;
  options: string[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  isCustomType: boolean;
  onCustomTypeChange: (isCustom: boolean) => void;
  selectPlaceholder?: string;
  customPlaceholder?: string;
  testId?: string;
  className?: string;
}

/**
 * A reusable form component that provides a dropdown of predefined types
 * with an option to enter a custom type via an integrated input field.
 */
export function CustomTypeSelector({
  label,
  options,
  value,
  onChange,
  isCustomType,
  onCustomTypeChange,
  selectPlaceholder = "Sélectionnez un type",
  customPlaceholder = "Type personnalisé",
  testId,
  className,
}: CustomTypeSelectorProps) {
  return (
    <FormItem className={cn("flex-1", className)}>
      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        {label}
      </FormLabel>
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
            <SelectTrigger data-testid={testId ? `select-${testId}` : undefined} variant="form">
              <SelectValue placeholder={selectPlaceholder} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <SelectItem value="custom" className="font-medium">
              Personnalisé...
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="relative group/custom-input">
          <FormControl>
            <Input
              data-testid={testId ? `input-${testId}` : undefined}
              placeholder={customPlaceholder}
              variant="form"
              className="pr-10 h-10 transition-all duration-300 border-border/40 focus:border-violet-500/50 bg-[#141414] hover:bg-[#181818]"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </FormControl>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center pr-1">
            <Button
              data-testid={testId ? `btn-reset-${testId}` : undefined}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                onCustomTypeChange(false);
                onChange('');
              }}
              className="h-7 w-7 rounded-lg text-muted-foreground/30 hover:text-foreground hover:bg-white/5 active:scale-90 transition-all duration-200"
              title="Retour à la liste"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
}
