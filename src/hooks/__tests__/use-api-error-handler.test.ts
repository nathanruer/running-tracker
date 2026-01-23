import { renderHook, act } from '@testing-library/react';
import { useApiErrorHandler } from '../use-api-error-handler';
import { vi } from 'vitest';
import { AppError, ErrorCode } from '@/lib/errors';

const mockToast = vi.fn();

vi.mock('../use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('@/lib/errors/reporter', () => ({
  reportError: vi.fn(),
}));

describe('useApiErrorHandler', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  describe('handleError', () => {
    it('should handle AppError with correct message', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(new AppError({
          code: ErrorCode.SESSION_SAVE_FAILED,
          message: 'Impossible de sauvegarder',
        }));
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Impossible de sauvegarder',
        variant: 'destructive',
      });
    });

    it('should handle AppError with default message from code', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(new AppError({ code: ErrorCode.NETWORK_TIMEOUT }));
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'La requête a pris trop de temps. Veuillez réessayer.',
        variant: 'default',
      });
    });

    it('should handle non-AppError as unknown error', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(new Error('Some error'));
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue.',
        variant: 'destructive',
      });
    });

    it('should use custom error message when provided', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(
          new AppError({ code: ErrorCode.UNKNOWN }),
          'Custom error message'
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Custom error message',
        variant: 'destructive',
      });
    });

    it('should use warning variant for warning severity', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(new AppError({ code: ErrorCode.STRAVA_RATE_LIMITED }));
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Trop de requêtes vers Strava. Veuillez patienter quelques minutes.',
        variant: 'default',
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

      const testFn = async () => 'success result';

      const wrappedResult = await result.current.wrapAsync(testFn);

      expect(wrappedResult).toBe('success result');
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should handle AppError and return undefined', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        throw new AppError({ code: ErrorCode.SESSION_SAVE_FAILED });
      };

      const wrappedResult = await result.current.wrapAsync(testFn);

      expect(wrappedResult).toBeUndefined();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la séance.',
        variant: 'destructive',
      });
    });

    it('should use custom error message when provided', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        throw new AppError({ code: ErrorCode.UNKNOWN });
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

      const testFn = async () => 'success result';

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
        throw new AppError({ code: ErrorCode.UNKNOWN });
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

    it('should use AppError message when no custom message provided', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED });
      };

      await result.current.wrapAsyncWithSuccess(testFn, {
        successTitle: 'Success',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Les données saisies sont invalides.',
        variant: 'destructive',
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null as unknown error', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(null);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue.',
        variant: 'destructive',
      });
    });

    it('should handle undefined as unknown error', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError(undefined);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue.',
        variant: 'destructive',
      });
    });

    it('should handle async functions that return undefined', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      const testFn = async () => undefined;

      const wrappedResult = await result.current.wrapAsync(testFn);

      expect(wrappedResult).toBeUndefined();
      expect(mockToast).not.toHaveBeenCalled();
    });
  });
});
