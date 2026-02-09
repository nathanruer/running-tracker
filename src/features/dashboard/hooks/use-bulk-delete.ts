import { useState } from 'react';

export function useBulkDelete(onBulkDelete: (ids: string[]) => Promise<void>) {
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const handleBulkDelete = (selectedSessionIds: string[], clearSelection: () => void) => {
    setShowBulkDeleteDialog(false);
    onBulkDelete(selectedSessionIds)
      .then(() => clearSelection())
      .catch(() => {});
  };

  return {
    showBulkDeleteDialog,
    setShowBulkDeleteDialog,
    handleBulkDelete,
  };
}
