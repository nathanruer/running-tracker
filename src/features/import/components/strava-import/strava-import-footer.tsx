import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StravaImportFooterProps } from './types';

export function StravaImportFooter({
  selectedCount,
  importing,
  onCancel,
  onImport,
}: StravaImportFooterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 p-4 md:p-8 border-t border-border/40 bg-background/50 backdrop-blur-sm">
      <Button
        variant="neutral"
        size="xl"
        onClick={onCancel}
        className="w-full sm:flex-1 text-xs md:text-sm font-bold"
      >
        Annuler
      </Button>
      <Button
        variant="action"
        size="xl"
        onClick={onImport}
        disabled={importing || selectedCount === 0}
        className="w-full sm:flex-[2] font-black text-xs md:text-sm"
      >
        {importing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Import...
          </>
        ) : (
          `Importer ${selectedCount} activité${selectedCount > 1 ? 's' : ''}`
        )}
      </Button>
    </div>
  );
}
