import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTypeFilter } from '../use-type-filter';

vi.mock('nuqs', () => ({
  useQueryState: vi.fn(() => [null, vi.fn()]),
  parseAsString: {
    withOptions: vi.fn(() => ({})),
  },
}));

import { useQueryState } from 'nuqs';

describe('useTypeFilter', () => {
  const mockSetType = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQueryState).mockReturnValue([null, mockSetType]);
  });

  it('should initialize with "all" type by default', () => {
    const { result } = renderHook(() => useTypeFilter());

    expect(result.current.selectedType).toBe('all');
  });

  it('should return the type from URL when set', () => {
    vi.mocked(useQueryState).mockReturnValue(['Footing', mockSetType]);

    const { result } = renderHook(() => useTypeFilter());

    expect(result.current.selectedType).toBe('Footing');
  });

  it('should call setType with null when changing to "all"', () => {
    const { result } = renderHook(() => useTypeFilter());

    act(() => {
      result.current.handleTypeChange('all');
    });

    expect(mockSetType).toHaveBeenCalledWith(null);
  });

  it('should call setType with value when changing to specific type', () => {
    const { result } = renderHook(() => useTypeFilter());

    act(() => {
      result.current.handleTypeChange('Footing');
    });

    expect(mockSetType).toHaveBeenCalledWith('Footing');
  });

  it('should call setType with value for other session types', () => {
    const { result } = renderHook(() => useTypeFilter());

    act(() => {
      result.current.handleTypeChange('Fractionné');
    });

    expect(mockSetType).toHaveBeenCalledWith('Fractionné');
  });

  it('should provide clearType function', () => {
    const { result } = renderHook(() => useTypeFilter());

    expect(typeof result.current.clearType).toBe('function');

    act(() => {
      result.current.clearType();
    });

    expect(mockSetType).toHaveBeenCalledWith(null);
  });

  it('should handle various type values from URL', () => {
    const types = ['Footing', 'Fractionné', 'Sortie longue', 'Course'];

    types.forEach((type) => {
      vi.mocked(useQueryState).mockReturnValue([type, mockSetType]);

      const { result } = renderHook(() => useTypeFilter());

      expect(result.current.selectedType).toBe(type);
    });
  });

  it('should return "all" when URL type is null', () => {
    vi.mocked(useQueryState).mockReturnValue([null, mockSetType]);

    const { result } = renderHook(() => useTypeFilter());

    expect(result.current.selectedType).toBe('all');
  });
});
