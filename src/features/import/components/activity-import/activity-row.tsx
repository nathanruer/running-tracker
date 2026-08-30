import React from 'react';
import { cn } from '@/lib/utils';
import { TableRow } from '@/components/ui/table';
import { ActivityRowCells } from './activity-row-cells';
import type { ActivityRowProps } from './types';

export const ActivityRow = React.memo(function ActivityRow({
  activity,
  index,
  selected,
  onToggleSelect,
  alreadyImported,
  grouped,
}: ActivityRowProps) {
  return (
    <TableRow
      className={cn(
        "transition-colors group/row border-none",
        alreadyImported
          ? "opacity-40 bg-green-500/[0.01] hover:bg-green-500/[0.01] cursor-default"
          : selected
            ? "bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer"
            : grouped
              ? "bg-violet-500/[0.04] hover:bg-violet-500/[0.07] cursor-pointer"
              : "hover:bg-muted/30 cursor-pointer"
      )}
      onClick={(e) => onToggleSelect(index, e)}
    >
      <ActivityRowCells
        activity={activity}
        selected={selected}
        alreadyImported={alreadyImported}
        attached={grouped === 'member'}
        onToggle={() => onToggleSelect(index)}
      />
    </TableRow>
  );
});
