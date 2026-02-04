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

  const resolveError = useCallback((error: unknown, customMessage?: string) => {
    const appError = AppError.fromUnknown(error);
    if (!customMessage) {
      return appError;
    }
    return new AppError({
      code: appError.code,
      message: customMessage,
      severity: appError.severity,
      isRecoverable: appError.isRecoverable,
      action: appError.action,
      statusCode: appError.statusCode,
      details: appError.details,
    });
  }, []);

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    const appError = resolveError(error, customMessage);
    
    if (scope === 'global' || AppError.isBlockingError(appError)) {
      reportGlobalError(appError);
    } else {
      setLocalError(appError);
    }
  }, [scope, reportGlobalError, resolveError]);

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
    onError?: (error: AppError) => void,
    errorMessage?: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        clearError();
        return await fn(...args);
      } catch (error) {
        const appError = resolveError(error, errorMessage);
        handleError(appError);
        onError?.(appError);
        return undefined;
      }
    };
  }, [handleError, clearError, resolveError]);

  const wrapAsyncWithSuccess = useCallback(async <T,>(
    fn: () => Promise<T>,
    options: {
      successTitle: string;
      successDescription?: string;
      errorMessage?: string;
    }
  ): Promise<T | undefined> => {
    try {
      const result = await fn();
      handleSuccess(options.successTitle, options.successDescription);
      return result;
    } catch (error) {
      handleError(error, options.errorMessage);
      return undefined;
    }
  }, [handleError, handleSuccess]);

  return {
    error: localError,
    handleError,
    handleSuccess,
    handleInfo,
    handleWarning,
    setLocalError,
    clearError,
    wrapAsync,
    wrapAsyncWithSuccess,
  };
}
