import { Loader2, Link2, EyeOff } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { parseDuration, formatDuration } from '@/lib/utils/duration';
import type { ImportableActivity } from '@/lib/services/api-client';

const COLUMN_COUNT = 7;

interface FragmentGroupRowProps {
  activities: ImportableActivity[];
  merging: boolean;
  onMerge: () => void;
  onDismiss: () => void;
}

/** Closes the group of recordings above: one outing to rebuild, or an extra recording to drop. */
export function FragmentGroupRow({ activities, merging, onMerge, onDismiss }: FragmentGroupRowProps) {
  const totalSeconds = activities.reduce((total, activity) => total + (parseDuration(activity.duration) ?? 0), 0);
  const totalDistance = activities.reduce((total, activity) => total + activity.distance, 0);

  return (
    <TableRow className="border-none bg-violet-500/[0.04] hover:bg-violet-500/[0.04]">
      <TableCell colSpan={COLUMN_COUNT} className="pt-0 pb-3 px-2 md:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-b-xl border-t border-violet-500/20 pl-3 pr-2 py-2">
          <p className="text-[11px] md:text-xs text-muted-foreground flex-1">
            Ces <span className="font-bold text-foreground/80">{activities.length} enregistrements</span> semblent
            être une seule sortie —{' '}
            <span className="font-bold text-foreground/80 tabular-nums">
              {formatDuration(totalSeconds)} · {totalDistance.toFixed(2)} km
            </span>{' '}
            au total.
          </p>
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Button
              type="button"
              variant="action"
              onClick={onMerge}
              disabled={merging}
              className="h-7 px-3 text-[11px] font-bold rounded-lg"
            >
              {merging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
              Fusionner
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDismiss}
              disabled={merging}
              className="h-7 px-3 text-[11px] font-bold rounded-lg bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Ignorer
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface DismissedHintRowProps {
  onRestore: () => void;
}

export function DismissedHintRow({ onRestore }: DismissedHintRowProps) {
  return (
    <TableRow className="border-none hover:bg-transparent">
      <TableCell colSpan={COLUMN_COUNT} className="pt-0 pb-3 px-2 md:px-4">
        <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 px-3 py-2">
          <p className="text-[11px] md:text-xs text-muted-foreground flex-1">Activité ignorée.</p>
          <Button
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              onRestore();
            }}
            className="h-7 px-3 text-[11px] font-bold rounded-lg"
          >
            Restaurer
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
