import { Table, TableBody } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InfiniteScrollTrigger, EndOfList } from '@/components/ui/data-table';
import { StravaTableHeader } from './strava-table-header';
import { StravaActivityRow } from './strava-activity-row';
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
      <InfiniteScrollTrigger
        hasMore={hasMore}
        loading={loadingMore}
        observerRef={observerTarget}
      />
      <EndOfList visible={!hasMore && activities.length > 0} />
    </ScrollArea>
  );
}
