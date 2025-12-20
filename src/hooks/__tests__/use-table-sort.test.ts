import { renderHook, act } from '@testing-library/react';
import { useTableSort } from '../use-table-sort';
import { vi } from 'vitest';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

vi.mock('lucide-react', () => ({
  ChevronUp: () => 'ChevronUp',
  ChevronDown: () => 'ChevronDown',
  ArrowUpDown: () => 'ArrowUpDown',
}));

describe('useTableSort', () => {
  const testItems = [
    { id: 1, name: 'Charlie', age: 30, date: new Date('2023-01-15') },
    { id: 2, name: 'Alice', age: 25, date: new Date('2023-01-10') },
    { id: 3, name: 'Bob', age: 35, date: new Date('2023-01-20') },
  ];

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTableSort(testItems));
    expect(result.current.sortColumn).toBeNull();
    expect(result.current.sortDirection).toBeNull();
  });

  it('should initialize with custom default values', () => {
    const { result } = renderHook(() => useTableSort(testItems, 'name', 'asc'));
    expect(result.current.sortColumn).toBe('name');
    expect(result.current.sortDirection).toBe('asc');
  });

  describe('handleSort', () => {
    it('should set sort column and direction on first click', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('should cycle through sort directions on subsequent clicks', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      
      // First click - desc
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortDirection).toBe('desc');

      // Second click - asc
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortDirection).toBe('asc');

      // Third click - null
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortDirection).toBeNull();
      expect(result.current.sortColumn).toBeNull();
    });

    it('should switch to new column when different column is clicked', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortColumn).toBe('name');

      act(() => {
        result.current.handleSort('age');
      });
      expect(result.current.sortColumn).toBe('age');
      expect(result.current.sortDirection).toBe('desc');
    });
  });

  describe('defaultComparator', () => {
    it('should sort numbers correctly', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      
      act(() => {
        result.current.handleSort('age');
      });

      const sorted = result.current.defaultComparator((item) => item.age);
      expect(sorted.map(i => i.age)).toEqual([35, 30, 25]); // desc
    });

    it('should sort strings correctly (case-insensitive)', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      
      act(() => {
        result.current.handleSort('name');
      });

      const sorted = result.current.defaultComparator((item) => item.name);
      expect(sorted.map(i => i.name)).toEqual(['Charlie', 'Bob', 'Alice']); // desc
    });

    it('should sort dates correctly', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      
      act(() => {
        result.current.handleSort('date');
      });

      const sorted = result.current.defaultComparator((item) => item.date);
      expect(sorted.map(i => i.date.getDate())).toEqual([20, 15, 10]); // desc
    });

    it('should handle null/undefined values', () => {
      const itemsWithNull = [
        { id: 1, name: 'Alice', value: null },
        { id: 2, name: 'Bob', value: 10 },
        { id: 3, name: 'Charlie', value: undefined },
      ];
      
      const { result } = renderHook(() => useTableSort(itemsWithNull));
      
      act(() => {
        result.current.handleSort('value');
      });

      const sorted = result.current.defaultComparator((item) => item.value);
      // null/undefined should be at the end
      expect(sorted.map(i => i.name)).toEqual(['Bob', 'Alice', 'Charlie']);
    });

    it('should handle mixed types', () => {
      const mixedItems = [
        { id: 1, value: 'text' },
        { id: 2, value: 42 },
        { id: 3, value: new Date('2023-01-01') },
      ];
      
      const { result } = renderHook(() => useTableSort(mixedItems));
      
      act(() => {
        result.current.handleSort('value');
      });

      const sorted = result.current.defaultComparator((item) => item.value);
      expect(sorted.length).toBe(3);
    });
  });

  describe('getSortedItems', () => {
    it('should use custom comparator function', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      
      act(() => {
        result.current.handleSort('name');
      });

      const customComparator = (a: { name: string }, b: { name: string }, column: string, direction: 'asc' | 'desc') => {
        if (column === 'name') {
          return direction === 'desc' 
            ? b.name.length - a.name.length
            : a.name.length - b.name.length;
        }
        return 0;
      };

      const sorted = result.current.getSortedItems(customComparator);
      expect(sorted.map(i => i.name)).toEqual(['Charlie', 'Alice', 'Bob']); // desc by length
    });

    it('should return unsorted items when no sort is active', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      
      const customComparator = () => 0;
      const sorted = result.current.getSortedItems(customComparator);
      
      expect(sorted).toEqual(testItems);
    });
  });

  describe('resetSort', () => {
    it('should reset sorting to initial state', () => {
      const { result } = renderHook(() => useTableSort(testItems));
      
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortColumn).toBe('name');

      act(() => {
        result.current.resetSort();
      });
      expect(result.current.sortColumn).toBeNull();
      expect(result.current.sortDirection).toBeNull();
    });

    it('should reset to custom default values if provided', () => {
      const { result } = renderHook(() => useTableSort(testItems, 'age', 'asc'));
      
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortColumn).toBe('name');

      act(() => {
        result.current.resetSort();
      });

      expect(result.current.sortColumn).toBeNull();
      expect(result.current.sortDirection).toBeNull();
    });
  });

  describe('SortIcon', () => {
    it('should render ArrowUpDown when not sorting by this column', () => {
      const { result } = renderHook(() => useTableSort(testItems));

      act(() => {
        result.current.handleSort('name');
      });

      const { SortIcon } = result.current;
      const icon = SortIcon({ column: 'age' });

      expect(icon.type).toBe(ArrowUpDown);
    });

    it('should render ChevronUp when sorting ascending', () => {
      const { result } = renderHook(() => useTableSort(testItems));

      act(() => {
        result.current.handleSort('name');
      });
      act(() => {
        result.current.handleSort('name');
      });

      const { SortIcon } = result.current;
      const icon = SortIcon({ column: 'name' });

      expect(icon.type).toBe(ChevronUp);
    });

    it('should render ChevronDown when sorting descending', () => {
      const { result } = renderHook(() => useTableSort(testItems));

      act(() => {
        result.current.handleSort('name');
      });

      const { SortIcon } = result.current;
      const icon = SortIcon({ column: 'name' });

      expect(icon.type).toBe(ChevronDown);
    });
  });
});