import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDateRangeFilter } from '../use-date-range-filter';

describe('useDateRangeFilter', () => {
  const mockItems = [
    { id: '1', date: '2024-01-01' },
    { id: '2', date: '2024-01-15' },
    { id: '3', date: '2024-02-01' },
    { id: '4', date: '2024-02-15' },
    { id: '5', date: null },
  ];

  const MOCK_NOW = new Date('2024-02-20T12:00:00Z');

  beforeEach(() => {
    vi.setSystemTime(MOCK_NOW);
  });

  it('should initialize with default range "all"', () => {
    const { result } = renderHook(() => useDateRangeFilter(mockItems));

    expect(result.current.dateRange).toBe('all');
    expect(result.current.filteredItems).toHaveLength(4);
  });

  it('should accept custom default range', () => {
    const { result } = renderHook(() => useDateRangeFilter(mockItems, '4weeks'));

    expect(result.current.dateRange).toBe('4weeks');
  });

  it('should filter items for 2 weeks range', () => {
    const { result } = renderHook(() => useDateRangeFilter(mockItems));

    act(() => {
      result.current.setDateRange('2weeks');
    });

    expect(result.current.filteredItems.length).toBeGreaterThanOrEqual(1);
    expect(result.current.filteredItems.some(item => item.id === '4')).toBe(true);
  });

  it('should filter items for 4 weeks range', () => {
    const { result } = renderHook(() => useDateRangeFilter(mockItems));

    act(() => {
      result.current.setDateRange('4weeks');
    });

    expect(result.current.filteredItems.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter items for 12 weeks range', () => {
    const { result } = renderHook(() => useDateRangeFilter(mockItems));

    act(() => {
      result.current.setDateRange('12weeks');
    });

    expect(result.current.filteredItems).toHaveLength(4);
  });

  it('should return all items when range is "all"', () => {
    const { result } = renderHook(() => useDateRangeFilter(mockItems));

    expect(result.current.dateRange).toBe('all');
    expect(result.current.filteredItems).toHaveLength(4);
  });

  describe('custom date range', () => {
    it('should filter items within custom date range', () => {
      const { result } = renderHook(() => useDateRangeFilter(mockItems));

      act(() => {
        result.current.setDateRange('custom');
        result.current.setCustomStartDate('2024-01-10');
        result.current.setCustomEndDate('2024-02-10');
      });

      const filtered = result.current.filteredItems;
      expect(filtered).toHaveLength(2);
      expect(filtered.some(item => item.id === '2')).toBe(true);
      expect(filtered.some(item => item.id === '3')).toBe(true);
    });

    it('should return all items when custom range has no dates set', () => {
      const { result } = renderHook(() => useDateRangeFilter(mockItems));

      act(() => {
        result.current.setDateRange('custom');
      });

      expect(result.current.filteredItems).toHaveLength(4);
    });

    it('should filter by start date only', () => {
      const { result } = renderHook(() => useDateRangeFilter(mockItems));

      act(() => {
        result.current.setDateRange('custom');
        result.current.setCustomStartDate('2024-02-01');
      });

      const filtered = result.current.filteredItems;
      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every(item => new Date(item.date!) >= new Date('2024-02-01'))).toBe(true);
    });

    it('should filter by end date only', () => {
      const { result } = renderHook(() => useDateRangeFilter(mockItems));

      act(() => {
        result.current.setDateRange('custom');
        result.current.setCustomEndDate('2024-01-20');
      });

      const filtered = result.current.filteredItems;
      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every(item => new Date(item.date!) <= new Date('2024-01-20'))).toBe(true);
    });

    it('should show error when custom range is less than 14 days', () => {
      const { result } = renderHook(() => useDateRangeFilter(mockItems));

      act(() => {
        result.current.setDateRange('custom');
        result.current.setCustomStartDate('2024-01-01');
        result.current.setCustomEndDate('2024-01-10');
      });

      expect(result.current.dateError).toBe('La plage doit être d\'au moins 2 semaines (14 jours)');
    });

    it('should not show error when custom range is 14 days or more', () => {
      const { result } = renderHook(() => useDateRangeFilter(mockItems));

      act(() => {
        result.current.setDateRange('custom');
        result.current.setCustomStartDate('2024-01-01');
        result.current.setCustomEndDate('2024-01-15');
      });

      expect(result.current.dateError).toBe('');
    });

    it('should exclude items when custom range is invalid', () => {
      const { result } = renderHook(() => useDateRangeFilter(mockItems));

      act(() => {
        result.current.setDateRange('custom');
        result.current.setCustomStartDate('2024-01-01');
        result.current.setCustomEndDate('2024-01-05');
      });

      expect(result.current.filteredItems).toHaveLength(0);
    });

    it('should reset custom dates', () => {
      const { result } = renderHook(() => useDateRangeFilter(mockItems));

      act(() => {
        result.current.setCustomStartDate('2024-01-01');
        result.current.setCustomEndDate('2024-02-01');
      });

      expect(result.current.customStartDate).toBe('2024-01-01');
      expect(result.current.customEndDate).toBe('2024-02-01');

      act(() => {
        result.current.resetCustomDates();
      });

      expect(result.current.customStartDate).toBe('');
      expect(result.current.customEndDate).toBe('');
    });
  });

  it('should exclude items without date', () => {
    const { result } = renderHook(() => useDateRangeFilter(mockItems));

    expect(result.current.filteredItems.every(item => item.date !== null)).toBe(true);
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() => useDateRangeFilter([]));

    expect(result.current.filteredItems).toHaveLength(0);
  });
});
