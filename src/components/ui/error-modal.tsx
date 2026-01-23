'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, LogOut, Home } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useErrorContext } from '@/contexts/error-context';
import { getBlockingErrorTitle, ErrorCode } from '@/lib/errors';

export function ErrorModal() {
  const { blockingError, dismissBlockingError } = useErrorContext();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (blockingError && primaryButtonRef.current) {
      primaryButtonRef.current.focus();
    }
  }, [blockingError]);

  if (!blockingError) return null;

  const { error } = blockingError;
  const title = getBlockingErrorTitle(error.code);
  const isAuthError = error.code === ErrorCode.AUTH_SESSION_EXPIRED || error.code === ErrorCode.AUTH_UNAUTHORIZED;

  const handlePrimaryAction = () => {
    if (error.action) {
      error.action.handler();
    }
    dismissBlockingError();
  };

  const handleSecondaryAction = () => {
    dismissBlockingError();
    window.location.href = '/';
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        hideClose
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby="error-modal-description"
      >
        <DialogHeader className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 animate-in zoom-in duration-500">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-center text-2xl font-bold tracking-tight">{title}</DialogTitle>
            <DialogDescription id="error-modal-description" className="text-center text-muted-foreground leading-relaxed px-4">
              {error.userMessage}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col">
          {error.action ? (
            <Button
              ref={primaryButtonRef}
              variant="action"
              size="lg"
              className="w-full"
              onClick={handlePrimaryAction}
            >
              {isAuthError && <LogOut className="mr-2 h-4 w-4" />}
              {error.action.label}
            </Button>
          ) : (
            <Button
              ref={primaryButtonRef}
              variant="action"
              size="lg"
              className="w-full"
              onClick={handleSecondaryAction}
            >
              <Home className="mr-2 h-4 w-4" />
              Retour à l&apos;accueil
            </Button>
          )}

          {error.action && (
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground"
              onClick={handleSecondaryAction}
            >
              Retour à l&apos;accueil
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
