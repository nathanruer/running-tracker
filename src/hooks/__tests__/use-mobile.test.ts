import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('767px') && window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should return false if window width is greater than or equal to 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should return true if window width is less than 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should update state when window is resized', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    const matchMediaMock = vi.mocked(window.matchMedia);
    const mql = matchMediaMock.mock.results[0].value;
    const addEventListenerMock = mql.addEventListener as Mock;
    const onChange = addEventListenerMock.mock.calls[0][1];

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      onChange();
    });

    expect(result.current).toBe(true);
  });

  it('should clean up event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());
    const matchMediaMock = vi.mocked(window.matchMedia);
    const mql = matchMediaMock.mock.results[0].value;
    const removeEventListenerMock = mql.removeEventListener as Mock;

    unmount();

    expect(removeEventListenerMock).toHaveBeenCalled();
  });
});
