import React from 'react';
import { cn } from '@/lib/utils';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { StravaTableHeaderProps } from './types';

interface SortableHeaderProps {
  column: string;
  label: string;
  sortColumn: string | null;
  onSort: (column: string) => void;
  SortIcon: React.FC<{ column: string }>;
  className?: string;
}

function SortableHeader({ column, label, sortColumn, onSort, SortIcon, className }: SortableHeaderProps) {
  return (
    <TableHead className={cn("text-center py-4 px-2 md:px-4", className)}>
      <button
        onClick={() => onSort(column)}
        className="flex items-center justify-center gap-1.5 hover:text-foreground transition-all w-full group"
      >
        <SortIcon column={column} />
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
            sortColumn === column ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-foreground/80'
          )}
        >
          {label}
        </span>
      </button>
    </TableHead>
  );
}

export const StravaTableHeader = React.forwardRef<HTMLTableSectionElement, StravaTableHeaderProps>(
  function StravaTableHeader(
    { mode, hasActivities, isAllSelected, onToggleSelectAll, sortColumn, onSort, SortIcon },
    ref
  ) {
    return (
      <TableHeader
        ref={ref}
        className="bg-transparent border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-20"
      >
        <TableRow className="hover:bg-transparent border-none">
          <TableHead className="w-[40px] md:w-[50px] py-4 px-2 md:px-4">
            {mode !== 'complete' && (
              <Checkbox
                checked={hasActivities && isAllSelected}
                onCheckedChange={onToggleSelectAll}
                className="border-muted-foreground/30"
              />
            )}
          </TableHead>
          <SortableHeader
            column="date"
            label="Date"
            sortColumn={sortColumn}
            onSort={onSort}
            SortIcon={SortIcon}
          />
          <TableHead className="py-4 px-2 md:px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
            Activité
          </TableHead>
          <SortableHeader
            column="duration"
            label="Durée"
            sortColumn={sortColumn}
            onSort={onSort}
            SortIcon={SortIcon}
            className="hidden sm:table-cell"
          />
          <SortableHeader
            column="distance"
            label="Dist."
            sortColumn={sortColumn}
            onSort={onSort}
            SortIcon={SortIcon}
          />
          <SortableHeader
            column="pace"
            label="Allure"
            sortColumn={sortColumn}
            onSort={onSort}
            SortIcon={SortIcon}
            className="hidden md:table-cell"
          />
          <SortableHeader
            column="heartRate"
            label="FC"
            sortColumn={sortColumn}
            onSort={onSort}
            SortIcon={SortIcon}
            className="hidden lg:table-cell"
          />
        </TableRow>
      </TableHeader>
    );
  }
);
