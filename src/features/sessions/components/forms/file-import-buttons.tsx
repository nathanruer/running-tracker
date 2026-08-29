import { Watch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNewIntervalsCount } from '@/features/import/hooks/use-new-intervals-count';

interface FileImportButtonsProps {
  mode?: 'create' | 'edit' | 'complete';
  onStravaClick?: () => void;
}

export function FileImportButtons({
  mode = 'create',
  onStravaClick,
}: FileImportButtonsProps) {
  const newActivitiesCount = useNewIntervalsCount();

  if (mode === 'edit' || !onStravaClick) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Options de synchronisation</p>
          <p className="text-xs text-muted-foreground/80 font-medium">
            Récupère ta course synchronisée depuis Garmin, prête à personnaliser.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onStravaClick && (
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-5 font-bold bg-violet-600 hover:bg-violet-500 text-white active:scale-95 transition-all border-none rounded-xl shadow-lg shadow-violet-500/10"
              onClick={onStravaClick}
            >
              <Watch className="mr-2 h-4 w-4" />
              Importer depuis intervals.icu
              {newActivitiesCount > 0 && (
                <span className="ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-white/20 text-white text-[10px] font-black flex items-center justify-center">
                  {newActivitiesCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
