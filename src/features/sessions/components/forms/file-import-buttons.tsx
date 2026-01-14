import { Watch } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileImportButtonsProps {
  mode?: 'create' | 'edit' | 'complete';
  onStravaClick?: () => void;
}

export function FileImportButtons({
  mode = 'create',
  onStravaClick,
}: FileImportButtonsProps) {
  if (mode === 'edit' || !onStravaClick) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Options d&apos;import</p>
          <p className="text-xs text-muted-foreground/80 font-medium">
            Synchronisez votre séance depuis Strava.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onStravaClick && (
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-5 font-bold bg-[#FC6100] hover:bg-[#E55700] text-white active:scale-95 transition-all border-none"
              onClick={onStravaClick}
            >
              <Watch className="mr-2 h-4 w-4" />
              Strava
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
