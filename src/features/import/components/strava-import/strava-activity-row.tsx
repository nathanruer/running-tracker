import React from 'react';
import { cn } from '@/lib/utils';
import { TableRow } from '@/components/ui/table';
import { StravaActivityRowCells } from './strava-activity-row-cells';
import type { StravaActivityRowProps } from './types';

export const StravaActivityRow = React.memo(function StravaActivityRow({
  activity,
  index,
  selected,
  onToggleSelect,
  alreadyImported,
}: StravaActivityRowProps) {
  return (
    <TableRow
      className={cn(
        "transition-colors group/row border-none",
        alreadyImported
          ? "opacity-40 bg-green-500/[0.01] hover:bg-green-500/[0.01] cursor-default"
          : selected
            ? "bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer"
            : "hover:bg-muted/30 cursor-pointer"
      )}
      onClick={(e) => onToggleSelect(index, e)}
    >
      <StravaActivityRowCells
        activity={activity}
        selected={selected}
        alreadyImported={alreadyImported}
        onToggle={() => onToggleSelect(index)}
      />
    </TableRow>
  );
});
