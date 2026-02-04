import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ExportSessions } from './export-sessions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { LoadingBar } from '@/components/ui/loading-bar';
import { type TrainingSession } from '@/lib/types';
import type { SortConfig, SortColumn } from '@/lib/domain/sessions';
import type { Period } from '../hooks/use-period-filter';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useBulkDelete } from '../hooks/use-bulk-delete';
import { SessionsTableToolbar } from './sessions-table-toolbar';
import { SessionsTableHead } from './sessions-table-head';
import { SessionsTableBody } from './sessions-table-body';
import { SessionsTableFooter } from './sessions-table-footer';

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
  sortConfig: SortConfig;
  onSort: (column: SortColumn, isMulti: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
  dateFrom?: string;
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
  sortConfig,
  onSort,
  searchQuery,
  onSearchChange,
  period,
  onPeriodChange,
  dateFrom,
}: SessionsTableProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);

  const {
    selectedKeys: selectedSessions,
    toggleSelectByKey,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
  } = useTableSelection(sessions, { mode: 'multiple', getKey: (session) => session.id });
  const { showBulkDeleteDialog, setShowBulkDeleteDialog, isDeletingBulk, handleBulkDelete } = useBulkDelete(actions.onBulkDelete);

  const hasActiveFilters = selectedType !== 'all' || searchQuery.trim() !== '' || period !== 'all';

  const handleClearFilters = () => {
    onTypeChange('all');
    onSearchChange('');
    onPeriodChange('all');
  };

  return (
    <>
      <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <SessionsTableToolbar
          initialLoading={initialLoading}
          totalCount={totalCount}
          selectedCount={selectedSessions.size}
          onClearSelection={clearSelection}
          onOpenBulkDelete={() => setShowBulkDeleteDialog(true)}
          onOpenExport={() => setShowExportDialog(true)}
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
          <LoadingBar isLoading={!!isFetching && !initialLoading} />
          <div className={cn(
            "overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/10 transition-opacity duration-500",
            isFetching && !initialLoading && sessions.length > 0 ? "opacity-60" : "opacity-100"
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

      <SessionsTableFooter
        hasMore={hasMore}
        sessionsCount={sessions.length}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
      />

      <ConfirmationDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Supprimer les séances sélectionnées"
        description={`Êtes-vous sûr de vouloir supprimer ${selectedSessions.size} séance${selectedSessions.size > 1 ? 's' : ''} ? Cette action est irréversible.`}
        confirmLabel="Confirmer la suppression"
        onConfirm={() => handleBulkDelete(Array.from(selectedSessions), clearSelection)}
        isLoading={isDeletingBulk}
        cancelTestId="bulk-delete-session-cancel"
        confirmTestId="bulk-delete-session-confirm"
      />

      <ExportSessions
        selectedType={selectedType}
        selectedSessions={selectedSessions}
        allSessions={sessions}
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        searchQuery={searchQuery}
        dateFrom={dateFrom}
      />
    </>
  );
}
