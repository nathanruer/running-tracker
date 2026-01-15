import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MoreVertical, FilterX } from 'lucide-react';
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
  viewMode: 'paginated' | 'all';
  onViewModeChange: (mode: 'paginated' | 'all') => void;
  actions: SessionActions;
  initialLoading: boolean;
}

export function SessionsTable({
  sessions,
  availableTypes,
  selectedType,
  onTypeChange,
  viewMode,
  onViewModeChange,
  actions,
  initialLoading,
}: SessionsTableProps) {
  const { sortColumn, sortDirection, handleSort, sortedSessions } = useSessionsTableSort(sessions);
  const { selectedSessions, toggleSessionSelection, toggleSelectAll, clearSelection, isAllSelected } = useSessionsSelection(sortedSessions);
  const { showBulkDeleteDialog, setShowBulkDeleteDialog, isDeletingBulk, handleBulkDelete } = useBulkDelete(actions.onBulkDelete);
  const [showExportDialog, setShowExportDialog] = useState(false);

  return (
    <>
      <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">        
        <CardHeader className="flex flex-col gap-6 px-8 py-8 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold tracking-tight">Historique des séances</CardTitle>
            {initialLoading ? (
              <div className="h-11 w-10 md:w-[180px] animate-pulse rounded-xl bg-muted shrink-0" />
            ) : actions.onNewSession ? (
              <Button
                data-testid="btn-new-session"
                onClick={actions.onNewSession}
                className="h-11 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-none active:scale-95 transition-all font-semibold shrink-0"
                title="Nouvelle séance"
              >
                <Plus className="h-4.5 w-4.5 mr-1.5" />
                <span className="hidden md:inline">Ajouter une séance</span>
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {initialLoading ? (
              <>
                <div className="h-10 w-full sm:w-[180px] animate-pulse rounded-xl bg-muted" />
                <div className="h-10 w-full sm:w-[180px] animate-pulse rounded-xl bg-muted" />
              </>
            ) : (
              <>
                <Select value={selectedType} onValueChange={onTypeChange}>
                  <SelectTrigger data-testid="filter-session-type" className="w-full sm:w-[200px] h-10 rounded-xl bg-muted/10 border-border/40 focus:ring-0">
                    <SelectValue placeholder="Type de séance" />
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
                <Select
                  value={viewMode}
                  onValueChange={(value: 'paginated' | 'all') => onViewModeChange(value)}
                >
                  <SelectTrigger data-testid="filter-view-mode" className="w-full sm:w-[180px] h-10 rounded-xl bg-muted/10 border-border/40 focus:ring-0">
                    <SelectValue placeholder="Affichage" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-none">
                    <SelectItem value="paginated">10 dernières</SelectItem>
                    <SelectItem value="all">Tout afficher</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
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
              <TableHeader className="bg-muted/5">
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
                            Essayez de modifier vos filtres ou d&apos;afficher tous les types.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTypeChange('all')}
                          className="mt-2 text-[10px] font-black uppercase tracking-widest text-violet-600 hover:text-violet-700 hover:bg-violet-600/5"
                        >
                          Réinitialiser les filtres
                        </Button>
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
