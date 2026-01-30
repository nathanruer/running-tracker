import { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Chercher...',
  className,
  isLoading,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  return (
    <div className={cn("relative w-full md:w-[300px]", className)}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="h-full w-full text-violet-500 animate-spin" />
        ) : (
          <Search className="h-full w-full text-muted-foreground/40" />
        )}
      </div>
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-9 h-9 md:h-10 rounded-xl bg-muted/10 border-border/40 focus:bg-muted/20 transition-all font-medium text-xs md:text-sm"
      />
      {localValue && !isLoading && (
        <button
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted/30 text-muted-foreground/60 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
