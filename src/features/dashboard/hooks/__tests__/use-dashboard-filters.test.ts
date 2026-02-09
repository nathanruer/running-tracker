import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDashboardFilters } from '../use-dashboard-filters';

const mockReplaceState = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', {
    value: { search: '', pathname: '/dashboard' },
    writable: true,
  });
  window.history.replaceState = mockReplaceState;
});

describe('useDashboardFilters', () => {
  describe('search', () => {
    it('should initialize with empty search', () => {
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.searchQuery).toBe('');
    });

    it('should read initial search from URL', () => {
      window.location.search = '?search=tempo';
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.searchQuery).toBe('tempo');
    });

    it('should update search query', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSearchChange('endurance'));
      expect(result.current.searchQuery).toBe('endurance');
    });

    it('should sync search to URL', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSearchChange('vma'));
      expect(mockReplaceState).toHaveBeenCalled();
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toContain('search=vma');
    });
  });

  describe('type filter', () => {
    it('should initialize with "all" type', () => {
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.selectedType).toBe('all');
    });

    it('should read initial type from URL', () => {
      window.location.search = '?type=VMA';
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.selectedType).toBe('VMA');
    });

    it('should update type', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleTypeChange('Fractionné'));
      expect(result.current.selectedType).toBe('Fractionné');
    });

    it('should not include type=all in URL', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleTypeChange('all'));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).not.toContain('type=');
    });
  });

  describe('period filter', () => {
    it('should initialize with "all" period', () => {
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.period).toBe('all');
      expect(result.current.dateFrom).toBeUndefined();
    });

    it('should read initial period from URL', () => {
      window.location.search = '?period=week';
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.period).toBe('week');
      expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return dateFrom for week period', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handlePeriodChange('week'));
      expect(result.current.dateFrom).toBeDefined();
      expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return dateFrom for month period', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handlePeriodChange('month'));
      expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return dateFrom for year period', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handlePeriodChange('year'));
      expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return undefined dateFrom for all period', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handlePeriodChange('all'));
      expect(result.current.dateFrom).toBeUndefined();
    });

    it('should ignore invalid period from URL', () => {
      window.location.search = '?period=invalid';
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.period).toBe('all');
    });
  });

  describe('sort', () => {
    it('should initialize with empty sort config', () => {
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.sortConfig).toEqual([]);
      expect(result.current.sortParam).toBeNull();
    });

    it('should read initial sort from URL', () => {
      window.location.search = '?sort=date:desc';
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.sortConfig).toEqual([{ column: 'date', direction: 'desc' }]);
      expect(result.current.sortParam).toBe('date:desc');
    });

    it('should handle single sort', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('date', false));
      expect(result.current.sortConfig).toEqual([{ column: 'date', direction: 'desc' }]);
    });

    it('should handle multi-sort', () => {
      window.location.search = '?sort=date:desc';
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('distance', true));
      expect(result.current.sortConfig).toEqual([
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'desc' },
      ]);
    });

    it('should toggle sort direction', () => {
      window.location.search = '?sort=date:desc';
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('date', true));
      expect(result.current.sortConfig).toEqual([{ column: 'date', direction: 'asc' }]);
    });

    it('should clear sort on third click', () => {
      window.location.search = '?sort=date:asc';
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('date', false));
      expect(result.current.sortConfig).toEqual([]);
      expect(result.current.sortParam).toBeNull();
    });

    it('should sync sort to URL', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSort('date', false));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toContain('sort=date');
    });

    it('should provide getColumnInfo', () => {
      window.location.search = '?sort=date:desc,distance:asc';
      const { result } = renderHook(() => useDashboardFilters());
      expect(result.current.getColumnInfo('date')).toEqual({ position: 1, direction: 'desc' });
      expect(result.current.getColumnInfo('distance')).toEqual({ position: 2, direction: 'asc' });
      expect(result.current.getColumnInfo('duration')).toBeNull();
    });
  });

  describe('URL sync', () => {
    it('should preserve Next.js history state', () => {
      const mockState = { __NA: true };
      Object.defineProperty(window.history, 'state', { value: mockState, writable: true });
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSearchChange('test'));
      expect(mockReplaceState.mock.calls.at(-1)?.[0]).toBe(mockState);
    });

    it('should build URL with multiple params', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => {
        result.current.handleSearchChange('tempo');
        result.current.handleTypeChange('VMA');
        result.current.handlePeriodChange('week');
      });
      const lastCall = mockReplaceState.mock.calls.at(-1);
      const url = lastCall?.[2] as string;
      expect(url).toContain('search=tempo');
      expect(url).toContain('type=VMA');
      expect(url).toContain('period=week');
    });

    it('should produce clean URL when all filters are default', () => {
      const { result } = renderHook(() => useDashboardFilters());
      act(() => result.current.handleSearchChange(''));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toBe('/dashboard');
    });
  });
});
