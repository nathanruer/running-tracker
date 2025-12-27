import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

interface SortIconProps {
  column: string;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
}

export function SortIcon({ column, sortColumn, sortDirection }: SortIconProps) {
  if (sortColumn !== column || sortDirection === null) {
    return <ArrowUpDown className="mr-2 h-4 w-4" />;
  }
  if (sortDirection === 'desc') {
    return <ChevronDown className="mr-2 h-4 w-4 text-foreground" />;
  }
  return <ChevronUp className="mr-2 h-4 w-4 text-foreground" />;
}
