import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nuqs', () => ({
  useQueryState: vi.fn(),
  parseAsString: {
    withOptions: vi.fn().mockReturnValue({}),
  },
}));

import { useQueryState } from 'nuqs';
import { useMultiSort } from '../use-multi-sort';

describe('useMultiSort', () => {
  const mockSetSortParam = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQueryState).mockReturnValue([null, mockSetSortParam]);
  });

  it('should return empty sortConfig when no URL param', () => {
    const { result } = renderHook(() => useMultiSort());

    expect(result.current.sortConfig).toEqual([]);
    expect(result.current.sortParam).toBeNull();
  });

  it('should parse sortParam from URL', () => {
    vi.mocked(useQueryState).mockReturnValue(['date:desc', mockSetSortParam]);

    const { result } = renderHook(() => useMultiSort());

    expect(result.current.sortConfig).toEqual([
      { column: 'date', direction: 'desc' },
    ]);
  });

  it('should call setSortParam when handling single sort', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('date', false);
    });

    expect(mockSetSortParam).toHaveBeenCalledWith('date:desc');
  });

  it('should add column in multi-sort mode', () => {
    vi.mocked(useQueryState).mockReturnValue(['date:desc', mockSetSortParam]);

    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('distance', true);
    });

    expect(mockSetSortParam).toHaveBeenCalledWith('date:desc,distance:desc');
  });

  it('should toggle direction in multi-sort mode', () => {
    vi.mocked(useQueryState).mockReturnValue(['date:desc', mockSetSortParam]);

    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('date', true);
    });

    expect(mockSetSortParam).toHaveBeenCalledWith('date:asc');
  });

  it('should clear sort when clicking same column third time', () => {
    vi.mocked(useQueryState).mockReturnValue(['date:asc', mockSetSortParam]);

    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('date', false);
    });

    expect(mockSetSortParam).toHaveBeenCalledWith(null);
  });

  it('should clear all sorts when clearSort is called', () => {
    vi.mocked(useQueryState).mockReturnValue(['date:desc,distance:asc', mockSetSortParam]);

    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.clearSort();
    });

    expect(mockSetSortParam).toHaveBeenCalledWith(null);
  });

  it('should return column info for sorted column', () => {
    vi.mocked(useQueryState).mockReturnValue(['date:desc,distance:asc', mockSetSortParam]);

    const { result } = renderHook(() => useMultiSort());

    const dateInfo = result.current.getColumnInfo('date');
    expect(dateInfo).toEqual({ position: 1, direction: 'desc' });

    const distanceInfo = result.current.getColumnInfo('distance');
    expect(distanceInfo).toEqual({ position: 2, direction: 'asc' });
  });

  it('should return null for unsorted column', () => {
    vi.mocked(useQueryState).mockReturnValue(['date:desc', mockSetSortParam]);

    const { result } = renderHook(() => useMultiSort());

    const info = result.current.getColumnInfo('distance');
    expect(info).toBeNull();
  });
});
