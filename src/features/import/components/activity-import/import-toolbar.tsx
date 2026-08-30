import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { ScopeIndicator } from '@/components/ui/data-table';
import type { ImportToolbarProps } from './types';

export function ImportToolbar({
  dismissedCount,
  showDismissed,
  onToggleDismissed,
  searchQuery,
  onSearchChange,
  activitiesCount,
  totalCount,
  filteredCount,
  loading,
  hasMore,
  searchLoading,
  isLoadingAll,
  searchProgress,
  onLoadAll,
  onCancelLoadAll,
}: ImportToolbarProps) {
  return (
    <div className="px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-border/10">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Filtrer par nom..."
        className="md:w-[320px]"
      />
      <div className="flex items-center gap-2 ml-auto">
        {dismissedCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={onToggleDismissed}
            className="h-7 px-3 text-[11px] font-bold rounded-full text-muted-foreground hover:text-foreground"
          >
            {showDismissed ? 'Masquer les ignorées' : `Ignorées (${dismissedCount})`}
          </Button>
        )}
        {loading ? (
          <div className="h-7 w-[180px] bg-muted/5 animate-pulse rounded-full border border-border/10" />
        ) : (
          <ScopeIndicator
            loadedCount={activitiesCount}
            totalCount={totalCount}
            hasMore={hasMore}
            searchLoading={searchLoading}
            searchProgress={searchProgress}
            filteredCount={filteredCount}
            searchQuery={searchQuery}
            onLoadAll={onLoadAll}
            isLoadingAll={isLoadingAll}
            onCancelLoadAll={onCancelLoadAll}
          />
        )}
      </div>
    </div>
  );
}
