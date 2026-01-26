import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSearch } from '../use-search';

vi.mock('nuqs', () => {
  const mockSetSearchQuery = vi.fn();
  return {
    useQueryState: vi.fn(() => ['', mockSetSearchQuery]),
    parseAsString: {
      withOptions: vi.fn(() => ({})),
    },
  };
});

import { useQueryState } from 'nuqs';

describe('useSearch', () => {
  const mockSetSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQueryState).mockReturnValue(['', mockSetSearch]);
  });

  it('should initialize with empty search query', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.searchQuery).toBe('');
  });

  it('should return current search query value', () => {
    vi.mocked(useQueryState).mockReturnValue(['marathon', mockSetSearch]);

    const { result } = renderHook(() => useSearch());

    expect(result.current.searchQuery).toBe('marathon');
  });

  it('should provide handleSearchChange function', () => {
    const { result } = renderHook(() => useSearch());

    expect(typeof result.current.handleSearchChange).toBe('function');
  });

  it('should call setSearch when handleSearchChange is called with value', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.handleSearchChange('test query');
    });

    expect(mockSetSearch).toHaveBeenCalledWith('test query');
  });

  it('should call setSearch with null when handleSearchChange is called with empty string', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.handleSearchChange('');
    });

    expect(mockSetSearch).toHaveBeenCalledWith(null);
  });

  it('should provide clearSearch function', () => {
    const { result } = renderHook(() => useSearch());

    expect(typeof result.current.clearSearch).toBe('function');

    act(() => {
      result.current.clearSearch();
    });

    expect(mockSetSearch).toHaveBeenCalledWith(null);
  });
});
