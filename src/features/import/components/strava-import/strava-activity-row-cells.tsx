import { cn } from '@/lib/utils';
import { TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { FormattedStravaActivity } from '@/lib/services/api-client';

interface CheckboxCellProps {
  selected: boolean;
  onToggle: () => void;
}

export function ActivityCheckboxCell({ selected, onToggle }: CheckboxCellProps) {
  return (
    <TableCell className="py-3 md:py-4 px-2 md:px-4" onClick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className={cn(
          "transition-all duration-300",
          selected
            ? "border-violet-500/50 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
            : "border-muted-foreground/30"
        )}
      />
    </TableCell>
  );
}

interface DateCellProps {
  date: string;
}

export function ActivityDateCell({ date }: DateCellProps) {
  return (
    <TableCell className="whitespace-nowrap text-center text-muted-foreground/50 font-medium tabular-nums text-[11px] md:text-[13px] tracking-tight py-3 md:py-4 px-2 md:px-4">
      {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}
    </TableCell>
  );
}

interface NameCellProps {
  name: string;
}

export function ActivityNameCell({ name }: NameCellProps) {
  return (
    <TableCell className="font-bold text-foreground/90 py-3 md:py-4 px-2 md:px-4 truncate max-w-[120px] md:max-w-[200px] text-xs md:text-sm">
      {name}
    </TableCell>
  );
}

interface DurationCellProps {
  duration: string;
}

export function ActivityDurationCell({ duration }: DurationCellProps) {
  return (
    <TableCell className="text-center py-3 md:py-4 px-2 md:px-4 hidden sm:table-cell">
      <span className="font-medium tabular-nums text-foreground/100 text-sm md:text-[15px] tracking-tight">
        {duration}
      </span>
    </TableCell>
  );
}

interface DistanceCellProps {
  distance: number;
}

export function ActivityDistanceCell({ distance }: DistanceCellProps) {
  return (
    <TableCell className="text-center py-3 md:py-4 px-2 md:px-4">
      <div className="flex items-baseline justify-center">
        <span className="font-medium tabular-nums text-foreground/100 text-sm md:text-[15px] tracking-tight">
          {distance.toFixed(2)}
        </span>
        <span className="ml-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">km</span>
      </div>
    </TableCell>
  );
}

interface PaceCellProps {
  pace: string;
}

export function ActivityPaceCell({ pace }: PaceCellProps) {
  return (
    <TableCell className="text-center py-3 md:py-4 px-2 md:px-4 hidden md:table-cell">
      <div className="flex items-baseline justify-center">
        <span className="font-medium tabular-nums text-foreground/100 text-sm md:text-[15px] tracking-tight">
          {pace}
        </span>
        <span className="ml-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">/km</span>
      </div>
    </TableCell>
  );
}

interface HeartRateCellProps {
  heartRate: number | null;
}

export function ActivityHeartRateCell({ heartRate }: HeartRateCellProps) {
  return (
    <TableCell className="text-center py-3 md:py-4 px-2 md:px-4 hidden lg:table-cell">
      {heartRate ? (
        <div className="flex items-baseline justify-center">
          <span className="font-medium tabular-nums text-foreground/100 text-sm md:text-[15px] tracking-tight">
            {Math.round(heartRate)}
          </span>
          <span className="ml-0.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">bpm</span>
        </div>
      ) : (
        <span className="text-muted-foreground/10 text-[15px]">-</span>
      )}
    </TableCell>
  );
}

interface AllCellsProps {
  activity: FormattedStravaActivity;
  selected: boolean;
  onToggle: () => void;
}

export function StravaActivityRowCells({ activity, selected, onToggle }: AllCellsProps) {
  return (
    <>
      <ActivityCheckboxCell selected={selected} onToggle={onToggle} />
      <ActivityDateCell date={activity.date} />
      <ActivityNameCell name={activity.comments} />
      <ActivityDurationCell duration={activity.duration} />
      <ActivityDistanceCell distance={activity.distance} />
      <ActivityPaceCell pace={activity.avgPace} />
      <ActivityHeartRateCell heartRate={activity.avgHeartRate} />
    </>
  );
}
