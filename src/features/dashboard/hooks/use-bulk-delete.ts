import { useState } from 'react';

export function useBulkDelete(onBulkDelete: (ids: string[]) => Promise<void>) {
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const handleBulkDelete = async (selectedSessionIds: string[], clearSelection: () => void) => {
    setIsDeletingBulk(true);
    try {
      await onBulkDelete(selectedSessionIds);
      clearSelection();
      setShowBulkDeleteDialog(false);
    } catch {
      // Deletion failed - error already handled by caller
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return {
    showBulkDeleteDialog,
    setShowBulkDeleteDialog,
    isDeletingBulk,
    handleBulkDelete,
  };
}
