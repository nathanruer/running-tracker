import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { LoadingBar } from '@/components/ui/loading-bar';
import { InfiniteScrollTrigger, EndOfList } from '@/components/ui/data-table';
import { type TrainingSession } from '@/lib/types';
import type { SortConfig, SortColumn } from '@/lib/domain/sessions';
import type { Period } from '../hooks/use-dashboard-filters';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useInfiniteScrollObserver } from '@/hooks/use-infinite-scroll-observer';
import { useBulkDelete } from '../hooks/use-bulk-delete';
import { SessionsTableToolbar } from './sessions-table-toolbar';
import { SessionsTableHead } from './sessions-table-head';
import { SessionsTableBody } from './sessions-table-body';

export interface SessionActions {
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onView?: (session: TrainingSession) => void;
  onPrefetchDetails?: (sessionId: string) => void;
  onNewSession?: () => void;
}

interface SessionsTableProps {
  sessions: TrainingSession[];
  availableTypes: string[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  actions: SessionActions;
  initialLoading: boolean;
  totalCount: number;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  isFetching?: boolean;
  deletingIds: Set<string>;
  sortConfig: SortConfig;
  onSort: (column: SortColumn, isMulti: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
  loadAllPages: () => Promise<void>;
  cancelLoadAll: () => void;
  isLoadingAll: boolean;
}

export function SessionsTable({
  sessions,
  availableTypes,
  selectedType,
  onTypeChange,
  actions,
  initialLoading,
  totalCount,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  isFetching,
  deletingIds,
  sortConfig,
  onSort,
  searchQuery,
  onSearchChange,
  period,
  onPeriodChange,
  loadAllPages,
  cancelLoadAll,
  isLoadingAll,
}: SessionsTableProps) {
  const {
    selectedKeys: selectedSessions,
    toggleSelectByKey,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
  } = useTableSelection(sessions, { mode: 'multiple', getKey: (session) => session.id });
  const { showBulkDeleteDialog, setShowBulkDeleteDialog, handleBulkDelete } = useBulkDelete(actions.onBulkDelete);

  const isDeleting = deletingIds.size > 0;
  const hasActiveFilters = selectedType !== 'all' || searchQuery.trim() !== '' || period !== 'all';

  const handleClearFilters = () => {
    onTypeChange('all');
    onSearchChange('');
    onPeriodChange('all');
  };

  const { observerRef } = useInfiniteScrollObserver({
    enabled: hasMore && !isFetchingNextPage,
    onIntersect: onLoadMore,
  });

  return (
    <>
      <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <SessionsTableToolbar
          totalCount={totalCount}
          loadedCount={sessions.length}
          hasMore={hasMore}
          isLoadingAll={isLoadingAll}
          onLoadAll={loadAllPages}
          onCancelLoadAll={cancelLoadAll}
          selectedCount={selectedSessions.size}
          onClearSelection={clearSelection}
          onOpenBulkDelete={() => setShowBulkDeleteDialog(true)}
          isDeleting={isDeleting}
          actions={{ onNewSession: actions.onNewSession }}
          selectedType={selectedType}
          availableTypes={availableTypes}
          onTypeChange={onTypeChange}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          isFetching={isFetching}
          period={period}
          onPeriodChange={onPeriodChange}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
        <CardContent className="p-0 relative">
          <LoadingBar isLoading={(!!isFetching || isDeleting) && !initialLoading} />
          <div className={cn(
            "overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/10 transition-opacity duration-500",
            isFetching && !initialLoading && !isDeleting && sessions.length > 0 ? "opacity-60" : "opacity-100"
          )}>
            <Table data-testid="sessions-table" className="table-auto min-w-[800px] md:min-w-0">
              <SessionsTableHead
                sortConfig={sortConfig}
                onSort={onSort}
                isAllSelected={isAllSelected()}
                onToggleSelectAll={toggleSelectAll}
              />
              <SessionsTableBody
                initialLoading={initialLoading}
                sessions={sessions}
                isFetching={isFetching}
                hasActiveFilters={hasActiveFilters}
                selectedSessions={selectedSessions}
                deletingIds={deletingIds}
                onToggleSelect={toggleSelectByKey}
                actions={{
                  onEdit: actions.onEdit,
                  onDelete: actions.onDelete,
                  onView: actions.onView,
                  onPrefetchDetails: actions.onPrefetchDetails,
                }}
              />
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 mb-12">
        <InfiniteScrollTrigger
          hasMore={hasMore}
          loading={isFetchingNextPage}
          observerRef={observerRef}
        />
        <EndOfList visible={!hasMore && sessions.length > 10} />
      </div>

      <ConfirmationDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Supprimer les séances sélectionnées"
        description={`Êtes-vous sûr de vouloir supprimer ${selectedSessions.size} séance${selectedSessions.size > 1 ? 's' : ''} ? Cette action est irréversible.`}
        confirmLabel="Confirmer la suppression"
        onConfirm={() => handleBulkDelete(Array.from(selectedSessions), clearSelection)}
        cancelTestId="bulk-delete-session-cancel"
        confirmTestId="bulk-delete-session-confirm"
      />
    </>
  );
}
