import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast, toast } from '../use-toast';

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
});

describe('standalone toast function', () => {
  it('should trigger listeners', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Standalone' });
    });

    expect(result.current.toasts[0].title).toBe('Standalone');
  });
});
