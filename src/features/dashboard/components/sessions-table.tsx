import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MoreVertical, FilterX, Search, X } from 'lucide-react';
import { ExportSessions } from './export-sessions';
import { SessionRow } from './session-row';
import { SortIcon } from './sort-icon';
import { SelectionBar } from './selection-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Input } from '@/components/ui/input';
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
}: SessionsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Filter based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const lowerQuery = searchQuery.toLowerCase();
    return sessions.filter(s => 
      s.sessionType.toLowerCase().includes(lowerQuery) ||
      (s.comments && s.comments.toLowerCase().includes(lowerQuery))
    );
  }, [sessions, searchQuery]);

  const { sortColumn, sortDirection, handleSort, sortedSessions } = useSessionsTableSort(filteredSessions);
  const { selectedSessions, toggleSessionSelection, toggleSelectAll, clearSelection, isAllSelected } = useSessionsSelection(sortedSessions);
  const { showBulkDeleteDialog, setShowBulkDeleteDialog, isDeletingBulk, handleBulkDelete } = useBulkDelete(actions.onBulkDelete);

  const hasActiveFilters = selectedType !== 'all' || searchQuery.trim() !== '';

  const handleClearFilters = () => {
    onTypeChange('all');
    setSearchQuery('');
  };

  return (
    <>
      <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-none overflow-hidden">        
        <CardHeader className="flex flex-col gap-6 px-8 py-8 border-b border-border/40">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl font-bold tracking-tight">Historique</CardTitle>
                {!initialLoading && (
                  <Badge variant="secondary" className="h-6 px-2 rounded-lg bg-muted/30 text-muted-foreground/70 font-bold border-none">
                    {totalCount}
                  </Badge>
                )}
              </div>
              
              {!initialLoading && actions.onNewSession && (
                <Button
                  data-testid="btn-new-session"
                  onClick={actions.onNewSession}
                  className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-none active:scale-95 transition-all font-bold shrink-0 text-xs uppercase tracking-wider"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle séance
                </Button>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                <Input
                  placeholder="Chercher une séance..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-muted/10 border-border/40 focus:bg-muted/20 transition-all font-medium text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted/30 text-muted-foreground/60 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Select value={selectedType} onValueChange={onTypeChange}>
                  <SelectTrigger data-testid="filter-session-type" className="w-full md:w-[180px] h-10 rounded-xl bg-muted/10 border-border/40 font-bold text-[11px] uppercase tracking-wider">
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
                    className="h-10 px-4 rounded-xl text-violet-600 hover:text-violet-700 hover:bg-violet-600/5 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all ml-auto md:ml-0"
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>

              {!initialLoading && (
                <div className="hidden md:flex items-center gap-3 ml-auto">
                  <div className="flex items-center bg-muted/5 border border-border/40 rounded-xl px-3 py-1.5 gap-2.5 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/30 whitespace-nowrap">
                      {paginatedCount} / {totalCount}
                    </span>
                    {paginatedCount > 10 && (
                      <>
                        <div className="w-[1px] h-3 bg-border/40" />
                        <button
                          onClick={onResetPagination}
                          className="text-[10px] font-black uppercase tracking-widest text-violet-500/60 hover:text-violet-500 transition-colors"
                        >
                          Réduire
                        </button>
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-auto">
              <TableHeader className="bg-transparent">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="w-12 px-6">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      className="border-muted-foreground/30 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 rounded-md"
                      aria-label="Sélectionner toutes les séances"
                    />
                  </TableHead>
                  <TableHead className="w-16 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">#</TableHead>
                  <TableHead className="w-16 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">Sem.</TableHead>
                  <TableHead className="w-32 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">Date</TableHead>
                  <TableHead className="whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">Séance</TableHead>
                  <TableHead className="w-24 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">
                    <button
                      data-testid="sort-duration"
                      onClick={() => handleSort('duration')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="duration" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'duration' ? 'text-foreground' : 'group-hover:text-foreground/80')}>Durée</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-24 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">
                    <button
                      data-testid="sort-distance"
                      onClick={() => handleSort('distance')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="distance" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'distance' ? 'text-foreground' : 'group-hover:text-foreground/80')}>Dist.</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-24 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">
                    <button
                      data-testid="sort-avgPace"
                      onClick={() => handleSort('avgPace')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="avgPace" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'avgPace' ? 'text-foreground' : 'group-hover:text-foreground/80')}>Allure</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-24 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">
                    <button
                      data-testid="sort-avgHeartRate"
                      onClick={() => handleSort('avgHeartRate')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="avgHeartRate" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'avgHeartRate' ? 'text-foreground' : 'group-hover:text-foreground/80')}>FC</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-20 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">
                    <button
                      data-testid="sort-perceivedExertion"
                      onClick={() => handleSort('perceivedExertion')}
                      className="flex items-center justify-center hover:text-foreground transition-all w-full group"
                    >
                      <SortIcon column="perceivedExertion" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={cn("transition-colors uppercase", sortColumn === 'perceivedExertion' ? 'text-foreground' : 'group-hover:text-foreground/80')}>RPE</span>
                    </button>
                  </TableHead>
                  <TableHead className="max-w-[40ch] text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 py-6">Commentaires</TableHead>
                  <TableHead className="w-14 text-center">
                    <div className="flex justify-center">
                      <MoreVertical className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialLoading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i} className="border-border/20 p-8">
                      <TableCell className="px-6"><div className="h-4 w-4 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-8 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-8 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
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
                      <TableCell className="min-w-[320px] px-8">
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

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les séances sélectionnées</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedSessions.size} séance{selectedSessions.size > 1 ? 's' : ''} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel data-testid="bulk-delete-session-cancel" disabled={isDeletingBulk} className="px-6 active:scale-95 transition-all">Annuler</AlertDialogCancel>
            <AlertDialogAction
              data-testid="bulk-delete-session-confirm"
              onClick={() => handleBulkDelete(Array.from(selectedSessions), clearSelection)}
              disabled={isDeletingBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 font-bold active:scale-95 transition-all"
            >
              {isDeletingBulk ? 'Suppression...' : 'Confirmer la suppression'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
