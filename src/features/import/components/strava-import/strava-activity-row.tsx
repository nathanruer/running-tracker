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
}: StravaActivityRowProps) {
  return (
    <TableRow
      className={cn(
        "transition-colors group/row border-none cursor-pointer",
        selected
          ? "bg-violet-500/5 hover:bg-violet-500/10"
          : "hover:bg-muted/30"
      )}
      onClick={() => onToggleSelect(index)}
    >
      <StravaActivityRowCells
        activity={activity}
        selected={selected}
        onToggle={() => onToggleSelect(index)}
      />
    </TableRow>
  );
});
