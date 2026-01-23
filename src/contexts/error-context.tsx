'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { AppError, ErrorCode } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { setGlobalErrorReporter } from '@/lib/errors/reporter';

interface BlockingError {
  error: AppError;
  id: string;
}

interface ErrorContextValue {
  blockingError: BlockingError | null;
  reportError: (error: unknown) => void;
  dismissBlockingError: () => void;
  clearAllErrors: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

let errorIdCounter = 0;

function generateErrorId(): string {
  errorIdCounter = (errorIdCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `error-${errorIdCounter}-${Date.now()}`;
}

interface ErrorProviderProps {
  children: ReactNode;
  onSessionExpired?: () => void;
}

export function ErrorProvider({ children, onSessionExpired }: ErrorProviderProps) {
  const [blockingError, setBlockingError] = useState<BlockingError | null>(null);

  const dismissBlockingError = useCallback(() => {
    setBlockingError(null);
  }, []);

  const clearAllErrors = useCallback(() => {
    setBlockingError(null);
  }, []);

  const reportError = useCallback((error: unknown) => {
    let appError = AppError.fromUnknown(error);

    if (AppError.isBlockingError(appError)) {
      if (appError.code === ErrorCode.AUTH_SESSION_EXPIRED && onSessionExpired) {
        appError = new AppError({
          code: appError.code,
          message: appError.userMessage,
          severity: appError.severity,
          isRecoverable: appError.isRecoverable,
          statusCode: appError.statusCode,
          details: appError.details,
          action: {
            label: 'Se reconnecter',
            handler: onSessionExpired,
          },
        });
      }

      setBlockingError((current) => {
        if (current?.error.code === appError.code) {
          return current;
        }
        return { error: appError, id: generateErrorId() };
      });
      return;
    }

    const toastConfig: Parameters<typeof toast>[0] = {
      title: 'Erreur',
      description: appError.userMessage,
      variant: appError.severity === 'warning' ? 'default' : 'destructive',
    };

    if (appError.action && appError.isRecoverable) {
      toastConfig.action = (
        <ToastAction altText={appError.action.label} onClick={appError.action.handler}>
          {appError.action.label}
        </ToastAction>
      );
    }

    toast(toastConfig);
  }, [onSessionExpired]);

  useEffect(() => {
    setGlobalErrorReporter(reportError);
    return () => {
      setGlobalErrorReporter(() => {});
    };
  }, [reportError]);

  return (
    <ErrorContext.Provider
      value={{
        blockingError,
        reportError,
        dismissBlockingError,
        clearAllErrors,
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorContext(): ErrorContextValue {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorContext must be used within ErrorProvider');
  }
  return context;
}

export function useErrorReporter() {
  const { reportError } = useErrorContext();
  return reportError;
}
