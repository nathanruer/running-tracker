import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInfiniteScrollObserver } from '../use-infinite-scroll-observer';

describe('useInfiniteScrollObserver', () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let intersectionCallback: IntersectionObserverCallback;
  const originalIO = globalThis.IntersectionObserver;

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();

    globalThis.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
        intersectionCallback = callback;
      }
      observe = observeMock;
      unobserve = unobserveMock;
      disconnect = vi.fn();
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords = vi.fn();
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIO;
  });

  it('returns an observerRef', () => {
    const { result } = renderHook(() =>
      useInfiniteScrollObserver({
        enabled: true,
        onIntersect: vi.fn(),
      })
    );
    expect(result.current.observerRef).toBeDefined();
  });

  it('does not create observer when disabled', () => {
    const spy = vi.spyOn(globalThis, 'IntersectionObserver' as never);
    renderHook(() =>
      useInfiniteScrollObserver({
        enabled: false,
        onIntersect: vi.fn(),
      })
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('calls onIntersect when target is intersecting', () => {
    const onIntersect = vi.fn();
    renderHook(() =>
      useInfiniteScrollObserver({
        enabled: true,
        onIntersect,
      })
    );

    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(onIntersect).toHaveBeenCalledOnce();
  });

  it('does not call onIntersect when target is not intersecting', () => {
    const onIntersect = vi.fn();
    renderHook(() =>
      useInfiniteScrollObserver({
        enabled: true,
        onIntersect,
      })
    );

    intersectionCallback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(onIntersect).not.toHaveBeenCalled();
  });
});
