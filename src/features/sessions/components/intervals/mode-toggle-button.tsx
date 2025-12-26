import { Button } from '@/components/ui/button';

interface ModeToggleButtonProps {
  mode: 'duration' | 'distance';
  onChange: (mode: 'duration' | 'distance') => void;
  labels?: {
    duration: string;
    distance: string;
  };
}

export function ModeToggleButton({
  mode,
  onChange,
  labels = { duration: 'Temps', distance: 'Dist.' },
}: ModeToggleButtonProps) {
  return (
    <div className="flex gap-1 rounded-md border border-input p-0.5">
      <Button
        type="button"
        size="sm"
        variant={mode === 'duration' ? 'secondary' : 'ghost'}
        onClick={() => onChange('duration')}
        className="h-7 px-3 text-xs"
      >
        {labels.duration}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'distance' ? 'secondary' : 'ghost'}
        onClick={() => onChange('distance')}
        className="h-7 px-3 text-xs"
      >
        {labels.distance}
      </Button>
    </div>
  );
}
