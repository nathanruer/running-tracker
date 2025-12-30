import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { useTruncationDetection } from '../use-truncation-detection';

describe('useTruncationDetection', () => {
  let observeMock: Mock;
  let disconnectMock: Mock;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    const ResizeObserverMock = vi.fn().mockImplementation(function() {
      return {
        observe: observeMock,
        unobserve: vi.fn(),
        disconnect: disconnectMock,
      };
    });
    
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should initialize with isTruncated as false', () => {
    const { result } = renderHook(() => useTruncationDetection('some content'));
    expect(result.current.isTruncated).toBe(false);
  });

  const setupMockElement = (result: { current: { elementRef: React.RefObject<HTMLDivElement | null> } }, props: Partial<HTMLDivElement>) => {
    const mockElement = props as HTMLDivElement;
    Object.defineProperty(result.current.elementRef, 'current', {
      value: mockElement,
      configurable: true,
      writable: true
    });
  };

  it('should detect truncation when scrollHeight > clientHeight', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTruncationDetection('test content', 0));
    
    setupMockElement(result, {
      scrollHeight: 100,
      clientHeight: 50,
      scrollWidth: 50,
      clientWidth: 50,
      parentElement: null,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    expect(result.current.isTruncated).toBe(true);
  });

  it('should detect truncation when scrollWidth > clientWidth', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTruncationDetection('test content', 0));
    
    setupMockElement(result, {
      scrollHeight: 50,
      clientHeight: 50,
      scrollWidth: 100,
      clientWidth: 50,
      parentElement: null,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.isTruncated).toBe(true);
  });

  it('should not detect truncation when dimensions are within limits', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTruncationDetection('test content', 0));
    
    setupMockElement(result, {
      scrollHeight: 50,
      clientHeight: 50,
      scrollWidth: 50,
      clientWidth: 50,
      parentElement: null,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.isTruncated).toBe(false);
  });

  it('should observe element and parent on mount', () => {
    const element = document.createElement('div');
    const parent = document.createElement('div');
    parent.appendChild(element);

    const { result } = renderHook(() => useTruncationDetection('test'));
    
    setupMockElement(result, element);

    const { result: result2, rerender } = renderHook(({ content }) => useTruncationDetection(content), {
      initialProps: { content: 'test' }
    });
    
    setupMockElement(result2, element);
    
    rerender({ content: 'test changed' });

    expect(observeMock).toHaveBeenCalled();
  });

  it('should cleanup observers and listeners on unmount', () => {
    const { unmount } = renderHook(() => useTruncationDetection('test'));
    
    unmount();
    
    expect(disconnectMock).toHaveBeenCalled();
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
