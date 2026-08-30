import { Loader2, Link2, EyeOff } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { ImportableActivity } from '@/lib/services/api-client';

const COLUMN_COUNT = 7;

function describe(activity: ImportableActivity): string {
  const time = new Date(activity.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${time} (${activity.duration}, ${activity.distance.toFixed(2)} km)`;
}

interface FragmentHintRowProps {
  fragments: ImportableActivity[];
  merging: boolean;
  onMerge: () => void;
  onDismiss: () => void;
}

/** Offers to rebuild one session out of the pieces the watch recorded, or to drop the extra one. */
export function FragmentHintRow({ fragments, merging, onMerge, onDismiss }: FragmentHintRowProps) {
  const label = fragments.map(describe).join(', ');

  return (
    <TableRow className="border-none hover:bg-transparent">
      <TableCell colSpan={COLUMN_COUNT} className="pt-0 pb-3 px-2 md:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] px-3 py-2">
          <p className="text-[11px] md:text-xs text-muted-foreground flex-1">
            L&apos;enregistrement de <span className="font-bold text-foreground/80">{label}</span> semble faire
            partie de cette séance.
          </p>
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Button
              type="button"
              variant="action"
              onClick={onMerge}
              disabled={merging}
              className="h-7 px-3 text-[11px] font-bold rounded-lg"
            >
              {merging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
              Fusionner
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDismiss}
              disabled={merging}
              className="h-7 px-3 text-[11px] font-bold rounded-lg text-muted-foreground hover:text-foreground"
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
