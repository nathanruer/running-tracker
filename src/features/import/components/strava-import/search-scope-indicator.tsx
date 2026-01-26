import type { SearchScopeIndicatorProps } from './types';

export function SearchScopeIndicator({
  loadedCount,
  totalCount,
  hasMore,
  searchLoading,
  searchProgress,
  filteredCount,
  searchQuery,
}: SearchScopeIndicatorProps) {
  if (searchLoading) {
    return (
      <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.12em] text-violet-500">
          Recherche... {searchProgress.loaded}/{searchProgress.total || '?'}
        </span>
      </div>
    );
  }

  if (searchQuery.trim()) {
    const scopeText = hasMore
      ? `${filteredCount} sur ${loadedCount} chargées`
      : `${filteredCount} résultat(s)`;

    return (
      <div className="flex items-center bg-muted/5 border border-border/40 rounded-xl px-3 py-1.5">
        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/30">
          {scopeText}
        </span>
      </div>
    );
  }

  const countText =
    totalCount && hasMore
      ? `${loadedCount} / ${totalCount} activités`
      : `${loadedCount} activités`;

  return (
    <div className="flex items-center bg-muted/5 border border-border/40 rounded-xl px-3 py-1.5">
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/30">
        {countText}
      </span>
    </div>
  );
}
