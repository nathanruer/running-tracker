import { CloudSun, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onEnrichWeather?: () => void;
  enrichCount?: number;
  isDeleting?: boolean;
  isEnriching?: boolean;
}

export function SelectionBar({
  selectedCount,
  onClear,
  onDelete,
  onEnrichWeather,
  enrichCount,
  isDeleting,
  isEnriching,
}: SelectionBarProps) {
  const safeEnrichCount = enrichCount ?? selectedCount;
  return (
    <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl bg-violet-600/5 border border-violet-600/20 p-3 md:pl-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between md:justify-start gap-4">
        <div className="flex items-center gap-4">
          <div
            data-testid="selection-count"
            className="flex items-center justify-center h-6 px-2.5 rounded-full bg-violet-600 text-white text-[10px] font-black"
          >
            {selectedCount}
          </div>
          {isDeleting ? (
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-violet-600">
                Suppression en cours…
              </span>
            </div>
          ) : (
            <>
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-foreground/80">
                Sélectionnée{selectedCount > 1 ? 's' : ''}
              </span>
              <div className="hidden md:block h-4 w-[1px] bg-violet-600/20" />
            </>
          )}
        </div>
        {!isDeleting && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 hover:text-violet-700 hover:bg-violet-600/5 transition-all"
          >
            Annuler
          </Button>
        )}
      </div>

      {!isDeleting && (
        <div className="flex items-center gap-2 md:gap-3">
          {onEnrichWeather && safeEnrichCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEnrichWeather}
              disabled={isEnriching}
              className={cn(
                "flex-1 md:flex-initial h-9 md:h-11 px-4 md:px-6 rounded-xl transition-all duration-300 shadow-none border font-bold text-[10px] md:text-[11px] uppercase tracking-wider active:scale-95",
                isEnriching 
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-600 cursor-default" 
                  : "bg-sky-500/5 border-sky-500/20 text-sky-600 hover:bg-sky-500/10 hover:border-sky-500/30"
              )}
              data-testid="bulk-enrich-weather-button"
            >
              {isEnriching ? (
                <Loader2 className="mr-1.5 md:mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudSun className="mr-1.5 md:mr-2 h-3.5 w-3.5 transition-transform group-hover:scale-110" />
              )}
              {isEnriching ? 'Enrichissement…' : `Enrichir (${safeEnrichCount})`}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="flex-1 md:flex-initial h-9 md:h-11 px-4 md:px-6 rounded-xl border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold text-[10px] md:text-[11px] uppercase tracking-wider active:scale-95 transition-all shadow-none"
            data-testid="bulk-delete-button"
          >
            <Trash2 className="mr-1.5 md:mr-2 h-3.5 w-3.5 opacity-70" />
            Supprimer ({selectedCount})
          </Button>
        </div>
      )}
    </div>
  );
}
