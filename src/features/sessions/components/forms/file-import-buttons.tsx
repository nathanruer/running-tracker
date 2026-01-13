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
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4">
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-medium">Importer une séance</p>
          <p className="text-sm text-muted-foreground">
            Pré-remplissez votre séance automatiquement depuis Strava.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onStravaClick && (
            <Button
              type="button"
              variant="secondary"
              className="gradient-orange"
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
