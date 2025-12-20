import { renderHook, act } from '@testing-library/react';
import { useApiErrorHandler } from '../use-api-error-handler';
import { vi } from 'vitest';

const mockToast = vi.fn();

vi.mock('../use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('useApiErrorHandler', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Test error',
        variant: 'destructive',
      });
    });

    it('should handle string errors', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError('String error');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'String error',
        variant: 'destructive',
      });
    });

    it('should handle unknown errors with default message', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError({});
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    });

    it('should use custom error message when provided', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(new Error('Original error'), 'Custom error message');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Custom error message',
        variant: 'destructive',
      });
    });
  });

  describe('handleSuccess', () => {
    it('should show success toast with title only', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleSuccess('Success title');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success title',
        description: undefined,
      });
    });

    it('should show success toast with title and description', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleSuccess('Success title', 'Success description');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success title',
        description: 'Success description',
      });
    });
  });

  describe('handleInfo', () => {
    it('should show info toast', () => {
      const { result } = renderHook(() => useApiErrorHandler());

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
    it('should show warning toast', () => {
      const { result } = renderHook(() => useApiErrorHandler());

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

  describe('wrapAsync', () => {
    it('should return result on successful execution', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        return 'success result';
      };

      const wrappedResult = await result.current.wrapAsync(testFn);

      expect(wrappedResult).toBe('success result');
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should handle errors and return undefined', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        throw new Error('Test error');
      };

      const wrappedResult = await result.current.wrapAsync(testFn);

      expect(wrappedResult).toBeUndefined();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Test error',
        variant: 'destructive',
      });
    });

    it('should use custom error message when provided', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        throw new Error('Original error');
      };

      await result.current.wrapAsync(testFn, 'Custom error message');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Custom error message',
        variant: 'destructive',
      });
    });
  });

  describe('wrapAsyncWithSuccess', () => {
    it('should return result and show success toast on successful execution', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        return 'success result';
      };

      const wrappedResult = await result.current.wrapAsyncWithSuccess(testFn, {
        successTitle: 'Success',
        successDescription: 'Operation completed',
      });

      expect(wrappedResult).toBe('success result');
      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Operation completed',
      });
    });

    it('should handle errors and show error toast', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        throw new Error('Test error');
      };

      const wrappedResult = await result.current.wrapAsyncWithSuccess(testFn, {
        successTitle: 'Success',
        errorMessage: 'Custom error',
      });

      expect(wrappedResult).toBeUndefined();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Custom error',
        variant: 'destructive',
      });
    });

    it('should use default error message when no custom message provided', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        throw new Error('Test error');
      };

      await result.current.wrapAsyncWithSuccess(testFn, {
        successTitle: 'Success',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Test error',
        variant: 'destructive',
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined errors', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(null);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    });

    it('should handle empty string errors', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError('');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    });

    it('should handle async functions that return undefined', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        return undefined;
      };

      const wrappedResult = await result.current.wrapAsync(testFn);

      expect(wrappedResult).toBeUndefined();
      expect(mockToast).not.toHaveBeenCalled();
    });
  });
});