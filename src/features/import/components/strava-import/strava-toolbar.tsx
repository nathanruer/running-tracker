import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import type { StravaToolbarProps } from './types';

export function StravaToolbar({
  searchQuery,
  onSearchChange,
  activitiesCount,
  totalCount,
  loading,
  hasMore,
  loadingAll,
  loadingMore,
  onLoadAll,
  onReset,
  topRef,
}: StravaToolbarProps) {
  return (
    <div className="px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-border/10">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Filtrer par nom..."
        className="md:w-[320px]"
      />
      <div className="flex items-center ml-auto">
        <div className="flex items-center bg-muted/5 border border-border/40 rounded-xl px-3 py-1.5 transition-all gap-2.5">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/30 whitespace-nowrap">
            {activitiesCount} / {totalCount ?? (loading ? '...' : '0')}
          </span>

          {(hasMore || activitiesCount > 20) && (
            <>
              <div className="w-[1px] h-3 bg-border/40" />
              <div className="flex items-center gap-3">
                {hasMore && (
                  <button
                    onClick={onLoadAll}
                    disabled={loadingAll || loadingMore}
                    className={cn(
                      "text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors",
                      loadingAll || loadingMore
                        ? "text-muted-foreground/20 cursor-not-allowed"
                        : "text-violet-500/60 hover:text-violet-500"
                    )}
                  >
                    Tout
                  </button>
                )}
                {activitiesCount > 20 && (
                  <button
                    onClick={() => {
                      onReset();
                      topRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={loadingAll || loadingMore}
                    className={cn(
                      "text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors",
                      loadingAll || loadingMore
                        ? "text-muted-foreground/20 cursor-not-allowed"
                        : "text-muted-foreground/40 hover:text-foreground"
                    )}
                  >
                    Réduire
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
