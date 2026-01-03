import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should debounce function calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 500));

    result.current('test1');
    result.current('test2');
    result.current('test3');

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test3');
  });

  it('should cancel previous timeout on subsequent calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 500));

    result.current('first');
    vi.advanceTimersByTime(250);

    result.current('second');
    vi.advanceTimersByTime(250);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('should cleanup timeout on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebounce(callback, 500));

    result.current('test');
    unmount();

    vi.advanceTimersByTime(500);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle updated callback', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ cb }) => useDebounce(cb, 500),
      { initialProps: { cb: callback1 } }
    );

    result.current('test');

    rerender({ cb: callback2 });

    vi.advanceTimersByTime(500);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith('test');
  });

  it('should work with multiple arguments', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 500));

    result.current('arg1', 'arg2', 'arg3');

    vi.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });
});
