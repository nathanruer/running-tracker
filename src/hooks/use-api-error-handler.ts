import { useCallback } from 'react';
import { useToast } from './use-toast';
import { AppError, reportError as globalReportError } from '@/lib/errors';

export function useApiErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    const appError = AppError.fromUnknown(error);

    if (AppError.isBlockingError(appError)) {
      globalReportError(appError);
      return;
    }

    const message = customMessage ?? appError.userMessage;

    toast({
      title: 'Erreur',
      description: message,
      variant: appError.severity === 'warning' ? 'default' : 'destructive',
    });
  }, [toast]);

  const handleSuccess = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
    });
  }, [toast]);

  const wrapAsync = useCallback(async <T,>(
    fn: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      handleError(error, errorMessage);
      return undefined;
    }
  }, [handleError]);

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

  const handleInfo = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
    });
  }, [toast]);

  const handleWarning = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'destructive',
    });
  }, [toast]);

  return {
    handleError,
    handleSuccess,
    handleInfo,
    handleWarning,
    wrapAsync,
    wrapAsyncWithSuccess,
  };
}
