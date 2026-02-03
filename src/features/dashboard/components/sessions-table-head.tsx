import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MultiSortIcon } from './multi-sort-icon';
import type { SortConfig, SortColumn } from '@/lib/domain/sessions';

interface SessionsTableHeadProps {
  sortConfig: SortConfig;
  onSort: (column: SortColumn, isMulti: boolean) => void;
  isAllSelected: boolean;
  onToggleSelectAll: (checked: boolean | 'indeterminate') => void;
}

export function SessionsTableHead({
  sortConfig,
  onSort,
  isAllSelected,
  onToggleSelectAll,
}: SessionsTableHeadProps) {
  const handleSort = (column: SortColumn, e: React.MouseEvent) => {
    onSort(column, e.shiftKey);
  };

  return (
    <TableHeader className="bg-transparent">
      <TableRow className="border-border/40 hover:bg-transparent">
        <TableHead className="w-10 md:w-12 px-2 md:px-6">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleSelectAll}
            className="border-muted-foreground/30 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 rounded-md scale-90 md:scale-100"
            aria-label="Sélectionner toutes les séances"
          />
        </TableHead>
        <TableHead className="w-16 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6 hidden sm:table-cell">#</TableHead>
        <TableHead className="w-16 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6 hidden lg:table-cell">Sem.</TableHead>
        <TableHead className="w-24 md:w-32 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">Date</TableHead>
        <TableHead className="w-32 md:w-40 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">Séance</TableHead>
        <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
          <button
            data-testid="sort-duration"
            onClick={(e) => handleSort('duration', e)}
            className="flex items-center justify-center hover:text-foreground transition-all w-full group"
          >
            <MultiSortIcon column="duration" sortConfig={sortConfig} />
            <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'duration') ? 'text-foreground' : 'group-hover:text-foreground/80')}>Durée</span>
          </button>
        </TableHead>
        <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
          <button
            data-testid="sort-distance"
            onClick={(e) => handleSort('distance', e)}
            className="flex items-center justify-center hover:text-foreground transition-all w-full group"
          >
            <MultiSortIcon column="distance" sortConfig={sortConfig} />
            <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'distance') ? 'text-foreground' : 'group-hover:text-foreground/80')}>Dist.</span>
          </button>
        </TableHead>
        <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
          <button
            data-testid="sort-avgPace"
            onClick={(e) => handleSort('avgPace', e)}
            className="flex items-center justify-center hover:text-foreground transition-all w-full group"
          >
            <MultiSortIcon column="avgPace" sortConfig={sortConfig} />
            <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'avgPace') ? 'text-foreground' : 'group-hover:text-foreground/80')}>Allure</span>
          </button>
        </TableHead>
        <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
          <button
            data-testid="sort-avgHeartRate"
            onClick={(e) => handleSort('avgHeartRate', e)}
            className="flex items-center justify-center hover:text-foreground transition-all w-full group"
          >
            <MultiSortIcon column="avgHeartRate" sortConfig={sortConfig} />
            <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'avgHeartRate') ? 'text-foreground' : 'group-hover:text-foreground/80')}>FC</span>
          </button>
        </TableHead>
        <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
          <button
            data-testid="sort-perceivedExertion"
            onClick={(e) => handleSort('perceivedExertion', e)}
            className="flex items-center justify-center hover:text-foreground transition-all w-full group"
          >
            <MultiSortIcon column="perceivedExertion" sortConfig={sortConfig} />
            <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'perceivedExertion') ? 'text-foreground' : 'group-hover:text-foreground/80')}>RPE</span>
          </button>
        </TableHead>
        <TableHead className="max-w-[40ch] text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6 hidden xl:table-cell">Commentaires</TableHead>
        <TableHead className="w-14 text-center">
          <div className="flex justify-center">
            <MoreVertical className="h-4 w-4 text-muted-foreground/20" />
          </div>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
