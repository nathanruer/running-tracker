import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MoreVertical, FilterX } from 'lucide-react';
import { ExportSessions } from './export-sessions';
import { SessionRow } from './session-row';
import { SortIcon } from './sort-icon';
import { SelectionBar } from './selection-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Badge } from '@/components/ui/badge';
import { type TrainingSession } from '@/lib/types';
import { useSessionsTableSort } from '../hooks/use-sessions-table-sort';
import { useSessionsSelection } from '../hooks/use-sessions-selection';
import { useBulkDelete } from '../hooks/use-bulk-delete';

export interface SessionActions {
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onView?: (session: TrainingSession) => void;
  onNewSession?: () => void;
}

interface SessionsTableProps {
  sessions: TrainingSession[];
  availableTypes: string[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  actions: SessionActions;
  initialLoading: boolean;
  paginatedCount: number;
  totalCount: number;
  onResetPagination: () => void;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  isFetching?: boolean;
  isShowingAll?: boolean;
  onShowAll?: () => void;
}

export function SessionsTable({
  sessions,
  availableTypes,
  selectedType,
  onTypeChange,
  actions,
  initialLoading,
  paginatedCount,
  totalCount,
  onResetPagination,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  isFetching,
  isShowingAll,
  onShowAll,
}: SessionsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const lowerQuery = searchQuery.toLowerCase();
    return sessions.filter(s => 
      s.sessionType.toLowerCase().includes(lowerQuery) ||
      (s.comments && s.comments.toLowerCase().includes(lowerQuery))
    );
  }, [sessions, searchQuery]);

  const { sortColumn, sortDirection, handleSort: originalHandleSort, sortedSessions } = useSessionsTableSort(filteredSessions);
  
  const handleSort = (column: string) => {
    if (onShowAll && !isShowingAll) {
      onShowAll();
    }
    originalHandleSort(column);
  };

  const { selectedSessions, toggleSessionSelection, toggleSelectAll, clearSelection, isAllSelected } = useSessionsSelection(sortedSessions);
  const { showBulkDeleteDialog, setShowBulkDeleteDialog, isDeletingBulk, handleBulkDelete } = useBulkDelete(actions.onBulkDelete);

  const hasActiveFilters = selectedType !== 'all' || searchQuery.trim() !== '';

  const handleClearFilters = () => {
    onTypeChange('all');
    setSearchQuery('');
  };

  return (
    <>
      <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <CardHeader className="flex flex-col gap-5 px-4 py-5 md:px-8 md:py-8 border-b border-border/40">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <CardTitle className="text-lg md:text-xl font-bold tracking-tight">Historique</CardTitle>
                {!initialLoading && (
                  <Badge variant="secondary" className="h-5 md:h-6 px-1.5 md:px-2 rounded-lg bg-muted/30 hover:bg-muted/30 text-muted-foreground/70 font-bold border-none text-[10px] md:text-xs">
                    {totalCount}
                  </Badge>
                )}
              </div>
              
              {!initialLoading && actions.onNewSession && (
                <Button
                  data-testid="btn-new-session"
                  onClick={actions.onNewSession}
                  variant="action"
                  size="xl"
                  className="group rounded-2xl w-10 h-10 md:w-auto md:h-12 p-0 md:px-8 transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40"
                >
                  <Plus className="h-5 w-5 md:h-4 md:w-4 md:mr-2 shrink-0 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                  <span className="hidden md:inline text-[11px] font-bold uppercase tracking-widest leading-none">Nouvelle séance</span>
                </Button>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
              />

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <Select value={selectedType} onValueChange={onTypeChange}>
                  <SelectTrigger data-testid="filter-session-type" className="w-full md:w-[180px] h-9 md:h-10 rounded-xl bg-muted/10 border-border/40 font-bold text-[10px] md:text-[11px] uppercase tracking-wider">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-none">
                    <SelectItem value="all">Tous les types</SelectItem>
                    {availableTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-9 md:h-10 px-3 md:px-4 rounded-xl text-violet-600 hover:text-violet-700 hover:bg-violet-600/5 font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-95 transition-all ml-auto md:ml-0"
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>

              {!initialLoading && (
                <div className="flex items-center gap-2.5 ml-auto">
                  <div className="flex items-center bg-muted/5 border border-border/40 rounded-xl px-2.5 py-1.5 transition-all">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/30 whitespace-nowrap">
                      {paginatedCount} / {totalCount || (isFetching ? '...' : '0')}
                    </span>
                    
                    {(paginatedCount > 10 || (onShowAll && !isShowingAll && (totalCount > paginatedCount || hasMore))) && (
                      <>
                        <div className="w-[1px] h-3 bg-border/40 mx-0.5" />
                        <div className="flex items-center gap-2.5">
                          {onShowAll && !isShowingAll && (totalCount > paginatedCount || hasMore) && (
                            <button
                              onClick={onShowAll}
                              className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-violet-500/60 hover:text-violet-500 transition-colors"
                            >
                              Tout
                            </button>
                          )}
                          {paginatedCount > 10 && (
                            <button
                              onClick={onResetPagination}
                              className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground transition-colors"
                            >
                              Réduire
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedSessions.size > 0 && (
            <SelectionBar
              selectedCount={selectedSessions.size}
              onClear={clearSelection}
              onDelete={() => setShowBulkDeleteDialog(true)}
              onExport={() => setShowExportDialog(true)}
            />
          )}
        </CardHeader>
        <CardContent className="p-0 relative">
          {isFetching && !initialLoading && (
            <div className="absolute top-0 left-0 right-0 h-[2px] z-20 overflow-hidden bg-violet-500/10">
              <div className="h-full w-full bg-violet-500 origin-left animate-loading-bar" />
            </div>
          )}
          
          <div className={cn(
            "overflow-x-auto transition-opacity duration-300 scrollbar-thin scrollbar-thumb-muted-foreground/10",
            isFetching && !initialLoading ? "opacity-50" : "opacity-100"
          )}>
            <Table data-testid="sessions-table" className="table-auto min-w-[800px] md:min-w-0">
              <TableHeader className="bg-transparent">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="w-10 md:w-12 px-2 md:px-6">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      className="border-muted-foreground/30 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 rounded-md scale-90 md:scale-100"
                      aria-label="Sélectionner toutes les séances"
                    />
                  </TableHead>
                  <TableHead className="w-16 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6 hidden sm:table-cell">#</TableHead>
                  <TableHead className="w-16 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6 hidden lg:table-cell">Sem.</TableHead>
                  <TableHead className="w-24 md:w-32 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">Date</TableHead>
                  <TableHead className="w-32 md:w-40 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">Séance</TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-duration"
                      onClick={() => handleSort('duration')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="duration" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'duration' ? 'text-foreground' : 'group-hover:text-foreground/80')}>Durée</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-distance"
                      onClick={() => handleSort('distance')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="distance" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'distance' ? 'text-foreground' : 'group-hover:text-foreground/80')}>Dist.</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-avgPace"
                      onClick={() => handleSort('avgPace')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="avgPace" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'avgPace' ? 'text-foreground' : 'group-hover:text-foreground/80')}>Allure</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-avgHeartRate"
                      onClick={() => handleSort('avgHeartRate')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="avgHeartRate" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'avgHeartRate' ? 'text-foreground' : 'group-hover:text-foreground/80')}>FC</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-perceivedExertion"
                      onClick={() => handleSort('perceivedExertion')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="perceivedExertion" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'perceivedExertion' ? 'text-foreground' : 'group-hover:text-foreground/80')}>RPE</span>
                    </button>
                  </TableHead>
                  <TableHead className="max-w-[40ch] text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6 hidden xl:table-cell">Commentaires</TableHead>
                  <TableHead className="w-14 text-center">
                    <div className="flex justify-center">
                      <MoreVertical className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialLoading || (isFetching && sortedSessions.length === 0) ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i} className="border-border/20 p-8">
                      <TableCell className="px-6"><div className="h-4 w-4 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell className="hidden sm:table-cell"><div className="h-6 w-8 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell className="hidden lg:table-cell"><div className="h-6 w-8 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-24 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 items-center">
                          <div className="h-5 w-32 animate-pulse rounded-lg bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                          <div className="h-3 w-20 animate-pulse rounded-lg bg-muted/50" style={{ animationDelay: `${i * 100}ms` }} />
                        </div>
                      </TableCell>
                      <TableCell><div className="h-6 w-16 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-16 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-16 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-16 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-10 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell className="min-w-[320px] px-8 hidden xl:table-cell">
                        <div className="flex flex-col gap-2">
                          <div className="h-3.5 w-[90%] animate-pulse rounded-full bg-muted/60" style={{ animationDelay: `${i * 100}ms` }} />
                          <div className="h-3.5 w-[75%] animate-pulse rounded-full bg-muted/40" style={{ animationDelay: `${i * 100}ms` }} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : sortedSessions.length > 0 ? (
                  sortedSessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onEdit={actions.onEdit}
                      onDelete={actions.onDelete}
                      showCheckbox={true}
                      isSelected={selectedSessions.has(session.id)}
                      onToggleSelect={() => toggleSessionSelection(session.id)}
                      onView={actions.onView}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in-95 duration-500">
                        <div className="p-4 rounded-full bg-muted/50 border border-border/50">
                          <FilterX className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">Aucun résultat trouvé</p>
                          <p className="text-xs text-muted-foreground">
                            Essayez de modifier vos filtres ou utilisez le bouton réinitialiser en haut.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {hasMore && sortedSessions.length > 0 && !searchQuery.trim() && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="neutral"
            size="lg"
            onClick={onLoadMore}
            className="w-full sm:w-auto border-border/40"
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Chargement...' : 'Voir plus'}
          </Button>
        </div>
      )}

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
      />
    </>
  );
}
