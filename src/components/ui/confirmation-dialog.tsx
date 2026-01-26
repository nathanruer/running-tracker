import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buttonVariants } from '@/components/ui/button';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  variant?: 'destructive' | 'default';
  cancelTestId?: string;
  confirmTestId?: string;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'destructive',
  cancelTestId,
  confirmTestId,
}: ConfirmationDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground/80 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <button
            data-testid={cancelTestId}
            onClick={handleCancel}
            disabled={isLoading}
            className={buttonVariants({ variant: 'neutral', size: 'xl', className: 'w-full sm:w-auto' })}
          >
            {cancelLabel}
          </button>
          <button
            data-testid={confirmTestId}
            onClick={handleConfirm}
            disabled={isLoading}
            className={buttonVariants({
              variant: variant === 'destructive' ? 'destructive-premium' : 'action',
              size: 'xl',
              className: 'w-full sm:w-auto mb-2 sm:mb-0'
            })}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {confirmLabel.replace('Confirmer', 'En cours...')}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
