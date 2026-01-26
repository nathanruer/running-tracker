import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MoreVertical, FilterX, Download, FileUp } from 'lucide-react';
import { ExportSessions } from './export-sessions';
import { SessionRow } from './session-row';
import { MultiSortIcon } from './multi-sort-icon';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type TrainingSession } from '@/lib/types';
import type { SortConfig, SortColumn } from '@/lib/domain/sessions';
import type { Period } from '../hooks/use-period-filter';
import { useSessionsSelection } from '../hooks/use-sessions-selection';
import { useBulkDelete } from '../hooks/use-bulk-delete';
import { PeriodFilter } from './period-filter';

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
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isFetchingNextPage, onLoadMore]);

  const handleSort = (column: SortColumn, e: React.MouseEvent) => {
    onSort(column, e.shiftKey);
  };

  const { selectedSessions, toggleSessionSelection, toggleSelectAll, clearSelection, isAllSelected } = useSessionsSelection(sessions);
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
        <CardHeader className="flex flex-col gap-4 px-3 py-4 md:px-8 md:py-8 border-b border-border/40">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <CardTitle className="text-lg md:text-2xl font-black tracking-tight truncate">
                  Historique
                </CardTitle>
                {!initialLoading && (
                  <div className="flex-shrink-0 px-2 py-0.5 rounded-full bg-violet-600/10 border border-violet-600/20 text-violet-600 font-black text-[9px] md:text-xs uppercase tracking-wider">
                    {totalCount}
                  </div>
                )}
              </div>
              
              {!initialLoading && (
                <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                  {actions.onNewSession && (
                    <Button
                      data-testid="btn-new-session"
                      onClick={actions.onNewSession}
                      variant="action"
                      size="sm"
                      className="group rounded-xl w-auto h-9 md:h-12 px-3 md:px-8 transition-all active:scale-95 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 md:h-4 md:w-4 shrink-0 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110 md:mr-2" />
                      <span className="hidden sm:inline text-[10px] md:text-[11px] font-bold uppercase tracking-widest leading-none">Nouvelle séance</span>
                      <span className="sm:hidden text-[9px] font-bold uppercase tracking-widest leading-none ml-1">Ajouter</span>
                    </Button>
                  )}

                  {selectedSessions.size === 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 md:h-12 md:w-12 rounded-xl border border-border/40 bg-muted/5 hover:bg-muted/10 shrink-0"
                          title="Actions de données"
                        >
                          <Download className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-border/40 bg-card/95 backdrop-blur-md shadow-2xl p-2">
                        <div className="px-2 py-1.5 mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                          Données
                        </div>
                        <DropdownMenuItem 
                          onClick={() => setShowExportDialog(true)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer focus:bg-violet-600/10 focus:text-violet-600 text-muted-foreground font-bold text-[10px] uppercase tracking-wider"
                        >
                          <Download className="h-4 w-4" />
                          Exporter
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          disabled
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 text-muted-foreground font-bold text-[10px] uppercase tracking-wider"
                        >
                          <FileUp className="h-4 w-4" />
                          Importer (Bientôt)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
              <div className="w-full xl:w-[320px]">
                <SearchInput
                  value={searchQuery}
                  onChange={onSearchChange}
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedType} onValueChange={onTypeChange}>
                  <SelectTrigger data-testid="filter-session-type" className="w-auto min-w-[120px] max-w-[150px] md:w-[160px] h-9 md:h-10 rounded-xl bg-muted/5 border-border/40 font-bold text-[9px] md:text-[11px] uppercase tracking-wider hover:bg-muted/10 transition-colors">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                    <SelectItem value="all">Tous les types</SelectItem>
                    {availableTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <PeriodFilter period={period} onPeriodChange={onPeriodChange} />

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-9 px-2.5 rounded-xl text-violet-600 hover:text-violet-700 hover:bg-violet-600/5 font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 ml-auto sm:ml-0"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Effacer</span>
                  </Button>
                )}
              </div>
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
                      onClick={(e) => handleSort('duration', e)}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <MultiSortIcon column="duration" sortConfig={sortConfig} />
                      <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'duration') ? 'text-foreground' : 'group-hover:text-foreground/80')}>Durée</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-distance"
                      onClick={(e) => handleSort('distance', e)}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <MultiSortIcon column="distance" sortConfig={sortConfig} />
                      <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'distance') ? 'text-foreground' : 'group-hover:text-foreground/80')}>Dist.</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-avgPace"
                      onClick={(e) => handleSort('avgPace', e)}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <MultiSortIcon column="avgPace" sortConfig={sortConfig} />
                      <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'avgPace') ? 'text-foreground' : 'group-hover:text-foreground/80')}>Allure</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-avgHeartRate"
                      onClick={(e) => handleSort('avgHeartRate', e)}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <MultiSortIcon column="avgHeartRate" sortConfig={sortConfig} />
                      <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'avgHeartRate') ? 'text-foreground' : 'group-hover:text-foreground/80')}>FC</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 md:w-24 whitespace-nowrap text-center text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-muted-foreground/60 py-4 md:py-6">
                    <button
                      data-testid="sort-perceivedExertion"
                      onClick={(e) => handleSort('perceivedExertion', e)}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <MultiSortIcon column="perceivedExertion" sortConfig={sortConfig} />
                      <span className={cn("transition-colors uppercase", sortConfig.some(s => s.column === 'perceivedExertion') ? 'text-foreground' : 'group-hover:text-foreground/80')}>RPE</span>
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
                {initialLoading || (isFetching && sessions.length === 0) ? (
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
                ) : sessions.length > 0 ? (
                  sessions.map((session) => (
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

      {hasMore && (
        <div ref={observerTarget} className="mt-6 flex flex-col items-center justify-center p-6 w-full min-h-[100px]">
          {isFetchingNextPage ? (
            <div className="w-full space-y-4 px-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 opacity-40">
                  <div className="h-10 w-10 bg-muted/20 animate-pulse rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-muted/20 animate-pulse rounded-lg" />
                  </div>
                  <div className="h-8 w-16 bg-muted/10 animate-pulse rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em] animate-pulse">
              DÉFILEZ POUR PLUS
            </p>
          )}
        </div>
      )}

      {!hasMore && sessions.length > 10 && (
        <div className="mt-8 mb-4 flex justify-center opacity-10">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Fin de l&apos;historique</span>
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
        searchQuery={searchQuery}
        dateFrom={dateFrom}
      />
    </>
  );
}
