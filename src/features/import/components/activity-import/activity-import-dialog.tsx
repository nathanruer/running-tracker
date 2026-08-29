'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ActivityImportContent } from './activity-import-content';
import type { ActivityImportDialogProps } from './types';

export function ActivityImportDialog({
  open,
  onOpenChange,
  onImport,
  mode = 'create',
  queryClient,
  onBulkImportSuccess,
}: ActivityImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="max-h-[90vh] overflow-hidden p-0 w-[95vw] sm:max-w-[800px] rounded-2xl border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl"
      >
        <ActivityImportContent
          open={open}
          onOpenChange={onOpenChange}
          onImport={onImport}
          mode={mode}
          queryClient={queryClient}
          onBulkImportSuccess={onBulkImportSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
