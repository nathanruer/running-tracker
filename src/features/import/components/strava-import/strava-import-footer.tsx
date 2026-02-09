import { Button } from '@/components/ui/button';
import type { StravaImportFooterProps } from './types';

export function StravaImportFooter({
  selectedCount,
  status,
  progress,
  onCancel,
  onImport,
  onCancelImport,
}: StravaImportFooterProps) {
  const isImporting = status === 'importing';
  const isTerminal = status === 'error' || status === 'cancelled';
  const percentage = progress.total > 0
    ? Math.round((progress.imported / progress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 p-4 md:p-8 border-t border-border/40 bg-background/50 backdrop-blur-sm">
      {isImporting ? (
        <>
          <Button
            variant="neutral"
            size="xl"
            onClick={onCancelImport}
            className="w-full sm:flex-1 text-xs md:text-sm font-bold"
          >
            Annuler
          </Button>
          <div className="relative w-full sm:flex-[2] h-11 md:h-12 rounded-xl overflow-hidden bg-violet-500/10 border border-violet-500/20">
            <div
              className="absolute inset-0 bg-violet-500/20 origin-left transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${percentage / 100})` }}
            />
            <div className="relative h-full flex items-center justify-center gap-2 text-xs md:text-sm font-black text-violet-600 dark:text-violet-400">
              <span>{progress.imported} sur {progress.total}</span>
              <span className="font-medium text-violet-500/60">—</span>
              <span className="font-medium">{percentage}%</span>
            </div>
          </div>
        </>
      ) : isTerminal ? (
        <>
          <Button
            variant="neutral"
            size="xl"
            onClick={onCancel}
            className="w-full sm:flex-1 text-xs md:text-sm font-bold"
          >
            Fermer
          </Button>
          <div className="relative w-full sm:flex-[2] h-11 md:h-12 rounded-xl overflow-hidden bg-amber-500/10 border border-amber-500/20">
            <div
              className="absolute inset-0 bg-amber-500/20 origin-left"
              style={{ transform: `scaleX(${percentage / 100})` }}
            />
            <div className="relative h-full flex items-center justify-center text-xs md:text-sm font-bold text-amber-600 dark:text-amber-400">
              {progress.imported} sur {progress.total} importées — interrompu
            </div>
          </div>
        </>
      ) : (
        <>
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
            disabled={selectedCount === 0}
            className="w-full sm:flex-[2] font-black text-xs md:text-sm"
          >
            {`Importer ${selectedCount} activité${selectedCount > 1 ? 's' : ''}`}
          </Button>
        </>
      )}
    </div>
  );
}
