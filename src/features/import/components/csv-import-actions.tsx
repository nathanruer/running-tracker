import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CsvImportActionsProps {
  isImporting: boolean;
  selectedCount: number;
  onCancel: () => void;
  onImport: () => void;
}

export function CsvImportActions({
  isImporting,
  selectedCount,
  onCancel,
  onImport,
}: CsvImportActionsProps) {
  return (
    <div className="flex gap-3">
      <Button
        variant="outline"
        onClick={onCancel}
        className="flex-1"
        disabled={isImporting}
      >
        Annuler
      </Button>
      <Button
        onClick={onImport}
        className="flex-1 gradient-violet"
        disabled={isImporting || selectedCount === 0}
      >
        {isImporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Import en cours...
          </>
        ) : (
          `Importer ${selectedCount} séance(s)`
        )}
      </Button>
    </div>
  );
}
