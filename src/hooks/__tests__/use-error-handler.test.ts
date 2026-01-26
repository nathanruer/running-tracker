import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../use-error-handler';
import { vi } from 'vitest';
import { AppError, ErrorCode } from '@/lib/errors';

const mockToast = vi.fn();
const mockReportError = vi.fn();

vi.mock('../use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('@/contexts/error-context', () => ({
  useErrorContext: () => ({
    reportError: mockReportError,
  }),
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockReportError.mockClear();
  });

  describe('handleError with global scope', () => {
    it('should report error globally by default', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(new AppError({ code: ErrorCode.SESSION_SAVE_FAILED }));
      });

      expect(mockReportError).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should report error globally when scope is global', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'global' }));

      act(() => {
        result.current.handleError(new AppError({ code: ErrorCode.VALIDATION_FAILED }));
      });

      expect(mockReportError).toHaveBeenCalled();
    });

    it('should always report blocking errors globally regardless of scope', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));

      act(() => {
        result.current.handleError(new AppError({
          code: ErrorCode.AUTH_SESSION_EXPIRED,
          severity: 'critical',
        }));
      });

      expect(mockReportError).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });
  });

  describe('handleError with local scope', () => {
    it('should set local error when scope is local', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));

      act(() => {
        result.current.handleError(new AppError({ code: ErrorCode.SESSION_SAVE_FAILED }));
      });

      expect(mockReportError).not.toHaveBeenCalled();
      expect(result.current.error).toBeInstanceOf(AppError);
      expect(result.current.error?.code).toBe(ErrorCode.SESSION_SAVE_FAILED);
    });

    it('should convert unknown errors to AppError', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));

      act(() => {
        result.current.handleError(new Error('Random error'));
      });

      expect(result.current.error).toBeInstanceOf(AppError);
      expect(result.current.error?.code).toBe(ErrorCode.UNKNOWN);
    });
  });

  describe('handleSuccess', () => {
    it('should show success toast with title only', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleSuccess('Operation successful');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Operation successful',
        description: undefined,
      });
    });

    it('should show success toast with title and description', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleSuccess('Success', 'Data saved successfully');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Data saved successfully',
      });
    });
  });

  describe('handleInfo', () => {
    it('should show info toast', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleInfo('Info title', 'Info description');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Info title',
        description: 'Info description',
      });
    });
  });

  describe('handleWarning', () => {
    it('should show warning toast with destructive variant', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleWarning('Warning title', 'Warning description');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Warning title',
        description: 'Warning description',
        variant: 'destructive',
      });
    });
  });

  describe('clearError', () => {
    it('should clear local error', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));

      act(() => {
        result.current.handleError(new AppError({ code: ErrorCode.UNKNOWN }));
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setLocalError', () => {
    it('should set local error directly', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));
      const error = new AppError({ code: ErrorCode.VALIDATION_FAILED });

      act(() => {
        result.current.setLocalError(error);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('wrapAsync', () => {
    it('should return result on successful execution', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testFn = vi.fn().mockResolvedValue('success');

      let wrappedResult: unknown;
      await act(async () => {
        wrappedResult = await result.current.wrapAsync(testFn)();
      });

      expect(wrappedResult).toBe('success');
      expect(testFn).toHaveBeenCalled();
    });

    it('should pass arguments to wrapped function', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testFn = vi.fn().mockResolvedValue('result');

      await act(async () => {
        await result.current.wrapAsync(testFn)('arg1', 42);
      });

      expect(testFn).toHaveBeenCalledWith('arg1', 42);
    });

    it('should handle error and return undefined', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testFn = vi.fn().mockRejectedValue(new AppError({ code: ErrorCode.SESSION_SAVE_FAILED }));

      let wrappedResult: unknown;
      await act(async () => {
        wrappedResult = await result.current.wrapAsync(testFn)();
      });

      expect(wrappedResult).toBeUndefined();
      expect(mockReportError).toHaveBeenCalled();
    });

    it('should call onError callback when error occurs', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testFn = vi.fn().mockRejectedValue(new AppError({ code: ErrorCode.UNKNOWN }));
      const onError = vi.fn();

      await act(async () => {
        await result.current.wrapAsync(testFn, onError)();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should clear error before executing', async () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));

      act(() => {
        result.current.setLocalError(new AppError({ code: ErrorCode.UNKNOWN }));
      });

      expect(result.current.error).not.toBeNull();

      const testFn = vi.fn().mockResolvedValue('success');

      await act(async () => {
        await result.current.wrapAsync(testFn)();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle null as unknown error', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));

      act(() => {
        result.current.handleError(null);
      });

      expect(result.current.error?.code).toBe(ErrorCode.UNKNOWN);
    });

    it('should handle undefined as unknown error', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));

      act(() => {
        result.current.handleError(undefined);
      });

      expect(result.current.error?.code).toBe(ErrorCode.UNKNOWN);
    });

    it('should handle string as unknown error', () => {
      const { result } = renderHook(() => useErrorHandler({ scope: 'local' }));

      act(() => {
        result.current.handleError('string error');
      });

      expect(result.current.error?.code).toBe(ErrorCode.UNKNOWN);
    });
  });
});
