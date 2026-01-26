import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useScrollToError } from '../use-scroll-to-error';

describe('useScrollToError', () => {
  const scrollIntoViewMock = vi.fn();
  const focusMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      height: 50,
    });
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    Element.prototype.closest = vi.fn().mockReturnValue(null);
    Element.prototype.querySelector = vi.fn().mockReturnValue({
      focus: focusMock,
    });

    const mockElement = document.createElement('div');
    mockElement.setAttribute('data-form-error', 'true');
    vi.spyOn(document, 'querySelectorAll').mockReturnValue([mockElement] as unknown as NodeListOf<Element>);
    
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should scroll to error when submitCount increases and errors exist', () => {
    const errors = { field1: { type: 'required', message: 'Required' } };
    
    const { rerender } = renderHook(
      ({ errors, submitCount }) => useScrollToError(errors, submitCount),
      {
        initialProps: { errors: {}, submitCount: 0 },
      }
    );

    rerender({ errors, submitCount: 1 });

    expect(scrollIntoViewMock).toHaveBeenCalled();
    
    act(() => {
      vi.runAllTimers();
    });
  });

  it('should not scroll if submitCount does not increase', () => {
    const errors = { field1: { type: 'required', message: 'Required' } };
    
    const { rerender } = renderHook(
        ({ errors, submitCount }) => useScrollToError(errors, submitCount),
        {
          initialProps: { errors, submitCount: 1 },
        }
      );
  
    vi.clearAllMocks();
    rerender({ errors, submitCount: 1 });
  
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('should not scroll if no errors', () => {
    const { rerender } = renderHook(
        ({ errors, submitCount }) => useScrollToError(errors, submitCount),
        {
          initialProps: { errors: {}, submitCount: 0 },
        }
      );
  
    rerender({ errors: {}, submitCount: 1 });
  
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});

import { act } from '@testing-library/react';
