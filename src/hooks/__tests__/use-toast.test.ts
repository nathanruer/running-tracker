import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast, toast, reducer } from '../use-toast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should add a toast and remove it after delay', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'Testing 123',
      });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');

    act(() => {
      result.current.dismiss(result.current.toasts[0].id);
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.toasts.length).toBe(0);
  });

  it('should dismiss a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string = '';
    act(() => {
      const t = result.current.toast({ title: 'To Dismiss' });
      toastId = t.id;
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should limit the number of toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Toast 1' });
      result.current.toast({ title: 'Toast 2' });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Toast 2');
  });

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast());

    let t: ReturnType<typeof toast>;
    act(() => {
      t = result.current.toast({ title: 'Initial' });
    });

    act(() => {
      t.update({ id: t.id, title: 'Updated' });
    });

    expect(result.current.toasts[0].title).toBe('Updated');
  });

  it('should dismiss all toasts when no toastId provided', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Toast 1' });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].open).toBe(true);

    // Dismiss without providing a toastId - should dismiss all toasts
    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should not add duplicate timeout for same toast', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string = '';
    act(() => {
      const t = result.current.toast({ title: 'Test Toast' });
      toastId = t.id;
    });

    // Dismiss the same toast twice
    act(() => {
      result.current.dismiss(toastId);
    });

    act(() => {
      result.current.dismiss(toastId);
    });

    // Run timers - should only remove once without errors
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.toasts.length).toBe(0);
  });

  it('should call dismiss when onOpenChange is called with false', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test Toast' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    // Simulate onOpenChange being called with false (e.g., when toast is closed by user)
    act(() => {
      result.current.toasts[0].onOpenChange?.(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});

describe('standalone toast function', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger listeners', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Standalone' });
    });

    expect(result.current.toasts[0].title).toBe('Standalone');
  });
});

describe('reducer', () => {
  it('should remove all toasts when REMOVE_TOAST has no toastId', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    };

    const result = reducer(initialState, { type: 'REMOVE_TOAST', toastId: undefined });

    expect(result.toasts).toEqual([]);
  });

  it('should remove specific toast when REMOVE_TOAST has toastId', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    };

    const result = reducer(initialState, { type: 'REMOVE_TOAST', toastId: '1' });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });
});
