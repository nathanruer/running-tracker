import { useState } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

/**
 * Generic hook for managing table sorting
 * Provides sorting state, sort handlers, and a SortIcon component
 *
 * @template T Type of items being sorted
 * @param items Array of items to sort
 * @param defaultColumn Initial column to sort by (optional)
 * @param defaultDirection Initial sort direction (optional)
 * @returns Object with sorting state, handlers, and utility functions
 *
 * @example
 * const { sortedItems, handleSort, SortIcon } = useTableSort(sessions);
 *
 * // In your render:
 * <th onClick={() => handleSort('date')}>
 *   Date <SortIcon column="date" />
 * </th>
 */
export function useTableSort<T>(
  items: T[],
  defaultColumn: string | null = null,
  defaultDirection: SortDirection = null
) {
  const [sortColumn, setSortColumn] = useState<string | null>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: desc -> asc -> null
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      // New column - start with desc
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortedItems = (
    compareFn: (a: T, b: T, column: string, direction: 'asc' | 'desc') => number
  ): T[] => {
    if (!sortColumn || !sortDirection) {
      return items;
    }

    return [...items].sort((a, b) => {
      return compareFn(a, b, sortColumn, sortDirection);
    });
  };

  const defaultComparator = (
    getValue: (item: T, column: string) => unknown
  ): T[] => {
    if (!sortColumn || !sortDirection) {
      return items;
    }

    return [...items].sort((a, b) => {
      const aValue = getValue(a, sortColumn);
      const bValue = getValue(b, sortColumn);

      //  null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        const diff = aValue.getTime() - bValue.getTime();
        return sortDirection === 'desc' ? -diff : diff;
      }

      // Handle strings (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortDirection === 'desc' ? -comparison : comparison;
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      }

      // Fallback to string comparison
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const resetSort = () => {
    setSortColumn(null);
    setSortDirection(null);
  };

  return {
    sortColumn,
    sortDirection,
    handleSort,
    getSortedItems,
    defaultComparator,
    SortIcon,
    resetSort,
  };
}
