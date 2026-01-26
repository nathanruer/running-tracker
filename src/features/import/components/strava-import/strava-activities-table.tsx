import { Table, TableBody } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StravaTableHeader } from './strava-table-header';
import { StravaActivityRow } from './strava-activity-row';
import { StravaLoadingMoreSkeleton } from './strava-loading-skeleton';
import { SmartSearchEmptyState } from './smart-search-empty-state';
import type { StravaActivitiesTableProps } from './types';

export function StravaActivitiesTable({
  activities,
  filteredActivities,
  mode,
  isSelected,
  isAllSelected,
  toggleSelect,
  toggleSelectAll,
  sortColumn,
  handleSort,
  SortIcon,
  hasMore,
  loadingMore,
  observerTarget,
  topRef,
  searchQuery,
  searchLoading,
  totalCount,
  totalLoadedCount,
  onSearchAll,
}: StravaActivitiesTableProps) {
  if (filteredActivities.length === 0 && searchQuery.trim()) {
    return (
      <ScrollArea className="flex-1">
        <SmartSearchEmptyState
          searchQuery={searchQuery}
          hasMore={hasMore}
          searchLoading={searchLoading}
          loadedCount={totalLoadedCount}
          totalCount={totalCount}
          onSearchAll={onSearchAll}
        />
      </ScrollArea>
    );
  }
  return (
    <ScrollArea className="flex-1">
      <div className="min-w-full overflow-x-auto px-4 md:px-8 py-2">
        <Table>
          <StravaTableHeader
            ref={topRef}
            mode={mode}
            hasActivities={filteredActivities.length > 0}
            isAllSelected={isAllSelected()}
            onToggleSelectAll={toggleSelectAll}
            sortColumn={sortColumn}
            onSort={handleSort}
            SortIcon={SortIcon}
          />
          <TableBody>
            {activities.map((activity) => {
              const index = filteredActivities.findIndex((a) => a.externalId === activity.externalId);
              return (
                <StravaActivityRow
                  key={activity.externalId}
                  activity={activity}
                  index={index}
                  selected={isSelected(index)}
                  onToggleSelect={toggleSelect}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
      {hasMore && (
        <div ref={observerTarget} className="flex flex-col items-center justify-center p-4 w-full min-h-[60px]">
          {loadingMore ? (
            <StravaLoadingMoreSkeleton />
          ) : (
            <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">
              Défilez pour charger plus
            </p>
          )}
        </div>
      )}
      {!hasMore && activities.length > 0 && (
        <div className="flex justify-center py-6 w-full opacity-10">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground whitespace-nowrap">
            Fin de l&apos;historique
          </span>
        </div>
      )}
    </ScrollArea>
  );
}
