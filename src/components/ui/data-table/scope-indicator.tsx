import { X, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScopeIndicatorProps } from './types';

export function ScopeIndicator({
  loadedCount,
  totalCount,
  hasMore,
  searchLoading = false,
  searchProgress,
  unit = 'activités',
  onLoadAll,
  isLoadingAll,
  onCancelLoadAll,
  isFetching = false,
}: ScopeIndicatorProps) {
  if (searchLoading && searchProgress) {
    return (
      <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 backdrop-blur-md rounded-full px-2 md:px-3 py-1 md:py-1.5 shadow-sm shrink-0">
        <Loader2 className="h-2.5 w-2.5 text-violet-500 animate-spin" />
        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.15em] text-violet-500 whitespace-nowrap">
          <span className="hidden xs:inline">Recherche... </span>{searchProgress.loaded}/{searchProgress.total || '?'}
        </span>
      </div>
    );
  }

  const isFullyLoaded = !hasMore && totalCount !== undefined;

  // Helper for French pluralization (0 and 1 are singular)
  const formatUnit = (count: number, baseUnit: string) => {
    if (count > 1) return baseUnit;
    if (baseUnit === 'séances') return 'séance';
    if (baseUnit === 'activités') return 'activité';
    return baseUnit;
  };

  // Compact version for mobile
  const scopeTextShort = isFetching 
    ? "..." 
    : hasMore && totalCount !== undefined
      ? `${loadedCount}/${totalCount}`
      : `${loadedCount}`;
    
  const scopeTextFull = isFetching
    ? "Mise à jour..."
    : hasMore && totalCount !== undefined
      ? `${loadedCount} / ${totalCount} ${formatUnit(totalCount, unit)}`
      : `${loadedCount} ${formatUnit(loadedCount, unit)}`;

  const showAction = !isFullyLoaded && onLoadAll;

  return (
    <div className={cn(
      "flex items-center rounded-full transition-all duration-500 border backdrop-blur-sm min-w-0 bg-muted/5 border-border/40 px-1 md:px-1.5 py-0.5 md:py-1",
      isFetching && "opacity-60"
    )}>
      <div className="flex items-center transition-all duration-500 px-2 md:px-3 gap-2 min-w-0">
        <span className={cn(
          "text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.15em] whitespace-nowrap transition-colors duration-500 leading-none truncate text-muted-foreground/40"
        )}>
          <span className="md:hidden">{scopeTextShort}</span>
          <span className="hidden md:inline">{scopeTextFull}</span>
        </span>
        {isFetching && !searchLoading && <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground/20 shrink-0" />}
      </div>

      <div className={cn(
        "flex items-center transition-all duration-500 overflow-hidden",
        showAction ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0"
      )}>
        <div className="w-px h-3 bg-border/40 shrink-0 mx-0.5 md:mx-1" />
        {isLoadingAll ? (
          <button
            onClick={(e) => { e.stopPropagation(); onCancelLoadAll?.(); }}
            className="px-1 md:px-2 h-6 text-orange-500/60 hover:text-orange-500 transition-all active:scale-95 group rounded-full flex items-center gap-1 md:gap-1.5 shrink-0"
          >
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            <span className="hidden md:inline text-[9px] md:text-[10px] font-bold uppercase tracking-wider leading-none whitespace-nowrap">Annuler</span>
            <X className="h-2.5 w-2.5 opacity-30 group-hover:opacity-100 shrink-0" />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onLoadAll?.(); }}
            className="px-1 md:px-2 h-6 text-muted-foreground/30 hover:text-violet-500 transition-all active:scale-95 rounded-full flex items-center shrink-0 gap-1"
          >
            <ChevronDown className="md:hidden h-3 w-3" />
            <span className="hidden md:inline text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all leading-none whitespace-nowrap">Tout charger</span>
          </button>
        )}
      </div>
    </div>
  );
}
