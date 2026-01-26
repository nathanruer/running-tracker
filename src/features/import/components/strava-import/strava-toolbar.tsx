import { SearchInput } from '@/components/ui/search-input';
import { SearchScopeIndicator } from './search-scope-indicator';
import { SearchAllButton } from './search-all-button';
import type { StravaToolbarProps } from './types';

export function StravaToolbar({
  searchQuery,
  onSearchChange,
  activitiesCount,
  totalCount,
  filteredCount,
  loading,
  hasMore,
  searchLoading,
  searchProgress,
  onLoadAll,
  onCancelSearch,
}: StravaToolbarProps) {
  return (
    <div className="px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-border/10">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Filtrer par nom..."
        className="md:w-[320px]"
      />
      <div className="flex items-center gap-2 ml-auto">
        <SearchAllButton
          hasMore={hasMore}
          searchLoading={searchLoading}
          onLoadAll={onLoadAll}
          onCancel={onCancelSearch}
        />
        {loading ? (
          <div className="flex items-center bg-muted/5 border border-border/40 rounded-xl px-3 py-1.5">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/30">
              ...
            </span>
          </div>
        ) : (
          <SearchScopeIndicator
            loadedCount={activitiesCount}
            totalCount={totalCount}
            hasMore={hasMore}
            searchLoading={searchLoading}
            searchProgress={searchProgress}
            filteredCount={filteredCount}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
}
