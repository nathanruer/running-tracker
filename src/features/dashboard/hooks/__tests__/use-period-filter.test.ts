import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePeriodFilter, type Period } from '../use-period-filter';

vi.mock('nuqs', () => ({
  useQueryState: vi.fn(() => [null, vi.fn()]),
  parseAsStringLiteral: vi.fn(() => ({
    withOptions: vi.fn(() => ({})),
  })),
}));

import { useQueryState } from 'nuqs';

describe('usePeriodFilter', () => {
  const mockSetPeriod = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQueryState).mockReturnValue([null, mockSetPeriod]);
  });

  it('should initialize with "all" period by default', () => {
    const { result } = renderHook(() => usePeriodFilter());

    expect(result.current.period).toBe('all');
  });

  it('should return undefined dateFrom for "all" period', () => {
    vi.mocked(useQueryState).mockReturnValue([null, mockSetPeriod]);

    const { result } = renderHook(() => usePeriodFilter());

    expect(result.current.dateFrom).toBeUndefined();
  });

  it('should return dateFrom for "week" period', () => {
    vi.mocked(useQueryState).mockReturnValue(['week', mockSetPeriod]);

    const { result } = renderHook(() => usePeriodFilter());

    expect(result.current.period).toBe('week');
    expect(result.current.dateFrom).toBeDefined();
    expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return dateFrom for "month" period', () => {
    vi.mocked(useQueryState).mockReturnValue(['month', mockSetPeriod]);

    const { result } = renderHook(() => usePeriodFilter());

    expect(result.current.period).toBe('month');
    expect(result.current.dateFrom).toBeDefined();
    expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return dateFrom for "year" period', () => {
    vi.mocked(useQueryState).mockReturnValue(['year', mockSetPeriod]);

    const { result } = renderHook(() => usePeriodFilter());

    expect(result.current.period).toBe('year');
    expect(result.current.dateFrom).toBeDefined();
    expect(result.current.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should call setPeriod with null when clearing to "all"', () => {
    const { result } = renderHook(() => usePeriodFilter());

    act(() => {
      result.current.handlePeriodChange('all');
    });

    expect(mockSetPeriod).toHaveBeenCalledWith(null);
  });

  it('should call setPeriod with value when changing to specific period', () => {
    const { result } = renderHook(() => usePeriodFilter());

    act(() => {
      result.current.handlePeriodChange('week');
    });

    expect(mockSetPeriod).toHaveBeenCalledWith('week');
  });

  it('should provide clearPeriod function', () => {
    const { result } = renderHook(() => usePeriodFilter());

    expect(typeof result.current.clearPeriod).toBe('function');

    act(() => {
      result.current.clearPeriod();
    });

    expect(mockSetPeriod).toHaveBeenCalledWith(null);
  });

  it('should handle all valid period values', () => {
    const periods: Period[] = ['all', 'week', 'month', 'year'];

    periods.forEach((period) => {
      vi.mocked(useQueryState).mockReturnValue([period === 'all' ? null : period, mockSetPeriod]);

      const { result } = renderHook(() => usePeriodFilter());

      expect(result.current.period).toBe(period);
    });
  });
});
