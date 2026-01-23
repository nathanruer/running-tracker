import * as React from 'react';
import { AlertCircle, XCircle, Info, AlertTriangle, RefreshCcw, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppError, ErrorCode } from '@/lib/errors';
import { Button } from './button';

interface ErrorMessageProps {
  error?: string | AppError | null;
  variant?: 'inline' | 'block';
  className?: string;
  onRetry?: () => void;
  showIcon?: boolean;
  hideTitle?: boolean;
}

export function ErrorMessage({
  error,
  variant = 'block',
  className,
  showIcon = true,
  hideTitle = false,
  onRetry,
}: ErrorMessageProps) {
  if (!error) return null;

  const isAppError = error instanceof AppError;
  const message = isAppError ? error.userMessage : error;
  const severity = isAppError ? error.severity : 'error';

  const icons = {
    critical: XCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  let Icon = icons[severity] || AlertCircle;
  if (isAppError && error.code === ErrorCode.NETWORK_OFFLINE) {
    Icon = CloudOff;
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200',
          severity === 'critical' || severity === 'error' ? 'text-destructive' : 'text-amber-600',
          className
        )}
      >
        {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-2xl border p-4 transition-all animate-in fade-in zoom-in-95 duration-300 backdrop-blur-sm shadow-sm',
        severity === 'critical' || severity === 'error'
          ? 'bg-destructive/10 border-destructive/20 text-destructive shadow-destructive/5'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 shadow-amber-500/5',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className={cn(
            "mt-0.5 rounded-full p-1",
            severity === 'critical' || severity === 'error' ? "bg-destructive/10" : "bg-amber-500/10"
          )}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
          </div>
        )}
        <div className="flex-1">
          {!hideTitle && (
            <p className="text-sm font-semibold leading-tight mb-1">
              {severity === 'critical' ? 'Erreur critique' : 
               severity === 'warning' ? 'Attention' : 
               severity === 'info' ? 'Information' : 'Une erreur est survenue'}
            </p>
          )}
          <p className="text-sm opacity-95 leading-relaxed font-medium">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className={cn(
              "h-8 px-2 hover:bg-transparent",
              severity === 'critical' || severity === 'error' 
                ? "text-destructive hover:text-destructive/80" 
                : "text-amber-600 hover:text-amber-600/80"
            )}
          >
            <RefreshCcw className="h-4 w-4 mr-1.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Réessayer</span>
          </Button>
        )}
      </div>
    </div>
  );
}
