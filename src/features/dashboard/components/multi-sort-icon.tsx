import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortColumn, SortConfig } from '@/lib/domain/sessions';

interface MultiSortIconProps {
  column: SortColumn;
  sortConfig: SortConfig;
}

export function MultiSortIcon({ column, sortConfig }: MultiSortIconProps) {
  const sortItem = sortConfig.find((item) => item.column === column);

  if (!sortItem) {
    return <ArrowUpDown className="mr-2 h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />;
  }

  const position = sortConfig.indexOf(sortItem) + 1;
  const showPosition = sortConfig.length > 1;

  return (
    <div className="relative mr-2">
      {sortItem.direction === 'desc' ? (
        <ChevronDown className="h-4 w-4 text-foreground" />
      ) : (
        <ChevronUp className="h-4 w-4 text-foreground" />
      )}
      {showPosition && (
        <span
          className={cn(
            'absolute -top-1.5 -right-1.5 flex items-center justify-center',
            'min-w-[14px] h-[14px] rounded-full',
            'text-[9px] font-bold',
            'bg-violet-600 text-white'
          )}
        >
          {position}
        </span>
      )}
    </div>
  );
}
