import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDashboardFilters } from '../use-dashboard-filters';

const mockReplace = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function setUrl(search: string) {
  currentSearch = search.startsWith('?') ? search.slice(1) : search;
  window.location.search = currentSearch ? `?${currentSearch}` : '';
}

beforeEach(() => {
  vi.clearAllMocks();
  currentSearch = '';
  Object.defineProperty(window, 'location', {
    value: { search: '', pathname: '/dashboard' },
    writable: true,
  });
  mockReplace.mockImplementation((url: string) => {
    setUrl(url.includes('?') ? url.slice(url.indexOf('?')) : '');
  });
});

describe('useDashboardFilters', () => {
  describe('search', () => {
    it('should initialize with empty search', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.searchQuery).toBe('');
    });

    it('should read initial search from URL', () => {
      setUrl('?search=tempo');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.searchQuery).toBe('tempo');
    });

    it('should update search query', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSearchChange('endurance'));
      rerender();
      expect(result.current.searchQuery).toBe('endurance');
    });

    it('should sync search to URL', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSearchChange('vma'));
      rerender();
      expect(mockReplace).toHaveBeenCalled();
      const lastCall = mockReplace.mock.calls.at(-1);
      expect(lastCall?.[0]).toContain('search=vma');
    });
  });

  describe('type filter', () => {
    it('should initialize with "all" type', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.selectedType).toBe('all');
    });

    it('should read initial type from URL', () => {
      setUrl('?type=VMA');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.selectedType).toBe('VMA');
    });

    it('should update type', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleTypeChange('Fractionné'));
      rerender();
      expect(result.current.selectedType).toBe('Fractionné');
    });

    it('should not include type=all in URL', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleTypeChange('all'));
      rerender();
      const lastCall = mockReplace.mock.calls.at(-1);
      expect(lastCall?.[0]).not.toContain('type=');
    });
  });

  describe('period filter', () => {
    it('should initialize with "all" period', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.period).toBe('all');
      expect(result.current.dateFrom).toBeUndefined();
    });

    it('should read initial period from URL', () => {
      setUrl('?period=week');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.period).toBe('week');
      expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return dateFrom for week period', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handlePeriodChange('week'));
      rerender();
      expect(result.current.dateFrom).toBeDefined();
      expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return dateFrom for month period', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handlePeriodChange('month'));
      rerender();
      expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return dateFrom for year period', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handlePeriodChange('year'));
      rerender();
      expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return undefined dateFrom for all period', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handlePeriodChange('all'));
      rerender();
      expect(result.current.dateFrom).toBeUndefined();
    });

    it('should ignore invalid period from URL', () => {
      setUrl('?period=invalid');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.period).toBe('all');
    });
  });

  describe('sort', () => {
    it('should initialize with empty sort config', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.sortConfig).toEqual([]);
      expect(result.current.sortParam).toBeNull();
    });

    it('should read initial sort from URL', () => {
      setUrl('?sort=date:desc');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.sortConfig).toEqual([{ column: 'date', direction: 'desc' }]);
      expect(result.current.sortParam).toBe('date:desc');
    });

    it('should handle single sort', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('date', false));
      rerender();
      expect(result.current.sortConfig).toEqual([{ column: 'date', direction: 'desc' }]);
    });

    it('should handle multi-sort', () => {
      setUrl('?sort=date:desc');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('distance', true));
      rerender();
      expect(result.current.sortConfig).toEqual([
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'desc' },
      ]);
    });

    it('should toggle sort direction', () => {
      setUrl('?sort=date:desc');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('date', true));
      rerender();
      expect(result.current.sortConfig).toEqual([{ column: 'date', direction: 'asc' }]);
    });

    it('should clear sort on third click', () => {
      setUrl('?sort=date:asc');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('date', false));
      rerender();
      expect(result.current.sortConfig).toEqual([]);
      expect(result.current.sortParam).toBeNull();
    });

    it('should sync sort to URL', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('date', false));
      rerender();
      const lastCall = mockReplace.mock.calls.at(-1);
      expect(lastCall?.[0]).toContain('sort=date');
    });

    it('should provide getColumnInfo', () => {
      setUrl('?sort=date:desc,distance:asc');
      const { result, rerender } = renderHook(() => useDashboardFilters());
      expect(result.current.getColumnInfo('date')).toEqual({ position: 1, direction: 'desc' });
      expect(result.current.getColumnInfo('distance')).toEqual({ position: 2, direction: 'asc' });
      expect(result.current.getColumnInfo('duration')).toBeNull();
    });
  });

  describe('URL sync', () => {
    it('should build URL with multiple params', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => {
        result.current.handleSearchChange('tempo');
        result.current.handleTypeChange('VMA');
        result.current.handlePeriodChange('week');
      });
      const lastCall = mockReplace.mock.calls.at(-1);
      const url = lastCall?.[0] as string;
      expect(url).toContain('search=tempo');
      expect(url).toContain('type=VMA');
      expect(url).toContain('period=week');
    });

    it('should produce clean URL when all filters are default', () => {
      const { result, rerender } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSearchChange(''));
      rerender();
      const lastCall = mockReplace.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe('/dashboard');
    });
  });
});
