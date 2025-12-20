import { useToast } from './use-toast';

/**
 * Hook for centralized API error handling
 * Provides consistent error and success toast notifications
 *
 * @returns Object with error and success handlers
 *
 * @example
 * const { handleError, handleSuccess, wrapAsync } = useApiErrorHandler();
 *
 * // Handle errors:
 * try {
 *   await apiCall();
 * } catch (error) {
 *   handleError(error);
 * }
 *
 * // Or wrap async functions:
 * await wrapAsync(async () => {
 *   const data = await apiCall();
 *   handleSuccess('Success', 'Operation completed');
 *   return data;
 * });
 */
export function useApiErrorHandler() {
  const { toast } = useToast();

  /**
   * Handles errors by showing a toast notification
   * @param error Error object or unknown error
   * @param customMessage Optional custom error message (takes priority if provided)
   */
  const handleError = (error: unknown, customMessage?: string) => {
    let message = 'Une erreur est survenue';

    // Custom message takes priority if provided (and not empty)
    if (customMessage) {
      message = customMessage;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string' && error.trim() !== '') {
      message = error;
    }

    toast({
      title: 'Erreur',
      description: message,
      variant: 'destructive',
    });
  };

  /**
   * Shows a success toast notification
   * @param title Toast title
   * @param description Toast description
   */
  const handleSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
    });
  };

  /**
   * Wraps an async function with error handling
   * Automatically shows error toast on failure
   * @param fn Async function to execute
   * @param errorMessage Optional custom error message
   * @returns Result of the function or undefined on error
   */
  const wrapAsync = async <T,>(
    fn: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      handleError(error, errorMessage);
      return undefined;
    }
  };

  /**
   * Wraps an async function with both error and success handling
   * @param fn Async function to execute
   * @param options Success and error messages
   * @returns Result of the function or undefined on error
   */
  const wrapAsyncWithSuccess = async <T,>(
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
  };

  /**
   * Shows an info toast notification
   * @param title Toast title
   * @param description Toast description
   */
  const handleInfo = (title: string, description?: string) => {
    toast({
      title,
      description,
    });
  };

  /**
   * Shows a warning toast notification
   * @param title Toast title
   * @param description Toast description
   */
  const handleWarning = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'destructive', // Using destructive as there's no warning variant
    });
  };

  return {
    handleError,
    handleSuccess,
    handleInfo,
    handleWarning,
    wrapAsync,
    wrapAsyncWithSuccess,
  };
}
