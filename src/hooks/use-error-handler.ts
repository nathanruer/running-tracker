import { useCallback, useState } from 'react';
import { useErrorContext } from '@/contexts/error-context';
import { AppError } from '@/lib/errors';
import { useToast } from './use-toast';

interface UseErrorHandlerOptions {
  scope?: 'global' | 'local';
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { scope = 'global' } = options;
  const { reportError: reportGlobalError } = useErrorContext();
  const { toast } = useToast();
  const [localError, setLocalError] = useState<AppError | null>(null);

  const handleError = useCallback((error: unknown) => {
    const appError = AppError.fromUnknown(error);
    
    if (scope === 'global' || AppError.isBlockingError(appError)) {
      reportGlobalError(appError);
    } else {
      setLocalError(appError);
    }
  }, [scope, reportGlobalError]);

  const handleSuccess = useCallback((title: string, description?: string) => {
    toast({ title, description });
  }, [toast]);

  const handleInfo = useCallback((title: string, description?: string) => {
    toast({ title, description });
  }, [toast]);

  const handleWarning = useCallback((title: string, description?: string) => {
    toast({ 
      title, 
      description,
      variant: 'destructive',
    });
  }, [toast]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  /**
   * Wrapper for async functions that catches errors and handles them.
   * Returns a function that can be used as an event handler.
   */
  const wrapAsync = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    onError?: (error: AppError) => void
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        clearError();
        return await fn(...args);
      } catch (error) {
        const appError = AppError.fromUnknown(error);
        handleError(appError);
        onError?.(appError);
        return undefined;
      }
    };
  }, [handleError, clearError]);

  return {
    error: localError,
    handleError,
    handleSuccess,
    handleInfo,
    handleWarning,
    setLocalError,
    clearError,
    wrapAsync,
  };
}
