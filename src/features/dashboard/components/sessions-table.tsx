import { useState } from 'react';
import { Plus, MoreVertical, FilterX } from 'lucide-react';
import { ExportSessions } from './export-sessions';
import { PlannedSessionRow } from './planned-session-row';
import { CompletedSessionRow } from './completed-session-row';
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
      <Card className="border-border/50">        
        <CardHeader className="flex flex-col gap-4 space-y-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Historique des séances</CardTitle>
            {initialLoading ? (
              <div className="h-10 w-10 md:w-[168px] animate-pulse rounded-md bg-muted shrink-0" />
            ) : actions.onNewSession ? (
              <Button
                data-testid="btn-new-session"
                onClick={actions.onNewSession}
                className="bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all font-bold shrink-0"
                title="Nouvelle séance"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden md:inline">Ajouter une séance</span>
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {initialLoading ? (
              <>
                <div className="h-8 w-full sm:w-[180px] animate-pulse rounded-md bg-muted" />
                <div className="h-8 w-full sm:w-[180px] animate-pulse rounded-md bg-muted" />
              </>
            ) : (
              <>
                <Select value={selectedType} onValueChange={onTypeChange}>
                  <SelectTrigger data-testid="filter-session-type" className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Type de séance" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger data-testid="filter-view-mode" className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Affichage" />
                  </SelectTrigger>
                  <SelectContent>
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
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      className="border-muted-foreground/50 data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
                      aria-label="Sélectionner toutes les séances"
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">#</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Sem.</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Date</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Séance</TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    <button
                      data-testid="sort-duration"
                      onClick={() => handleSort('duration')}
                      className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                    >
                      <SortIcon column="duration" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={sortColumn === 'duration' ? 'text-foreground' : ''}>Durée</span>
                    </button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    <button
                      data-testid="sort-distance"
                      onClick={() => handleSort('distance')}
                      className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                    >
                      <SortIcon column="distance" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Dist.</span>
                    </button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        data-testid="sort-avgPace"
                        onClick={() => handleSort('avgPace')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        <SortIcon column="avgPace" sortColumn={sortColumn} sortDirection={sortDirection} />
                        <span className={sortColumn === 'avgPace' ? 'text-foreground' : ''}>Allure</span>
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        data-testid="sort-avgHeartRate"
                        onClick={() => handleSort('avgHeartRate')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        <SortIcon column="avgHeartRate" sortColumn={sortColumn} sortDirection={sortDirection} />
                        <span className={sortColumn === 'avgHeartRate' ? 'text-foreground' : ''}>FC</span>
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    <button
                      data-testid="sort-perceivedExertion"
                      onClick={() => handleSort('perceivedExertion')}
                      className="flex items-center justify-center w-full hover:text-foreground transition-colors"
                    >
                      <SortIcon column="perceivedExertion" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={sortColumn === 'perceivedExertion' ? 'text-foreground' : ''}>RPE</span>
                    </button>
                  </TableHead>
                  <TableHead className="max-w-[40ch]">Commentaires</TableHead>
                  <TableHead className="w-10 text-center">
                    <MoreVertical className="h-4 w-4 mx-auto text-muted-foreground" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 w-4 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-8 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-12 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-24 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <div className="h-5 w-24 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                          <div className="h-3 w-16 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                        </div>
                      </TableCell>
                      <TableCell><div className="h-6 w-16 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-20 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-16 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-16 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell><div className="h-6 w-12 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell className="min-w-[320px]">
                        <div className="flex flex-col gap-2">
                          <div className="h-4 w-80 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                          <div className="h-4 w-72 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="h-8 w-8 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : sortedSessions.length > 0 ? (
                  sortedSessions.map((session) =>
                    session.status === 'planned' ? (
                      <PlannedSessionRow
                        key={session.id}
                        session={session}
                        onEdit={actions.onEdit}
                        onDelete={actions.onDelete}
                        showCheckbox={true}
                        isSelected={selectedSessions.has(session.id)}
                        onToggleSelect={() => toggleSessionSelection(session.id)}
                        onView={actions.onView}
                      />
                    ) : (
                      <CompletedSessionRow
                        key={session.id}
                        session={session}
                        onEdit={actions.onEdit}
                        onDelete={actions.onDelete}
                        showCheckbox={true}
                        isSelected={selectedSessions.has(session.id)}
                        onToggleSelect={() => toggleSessionSelection(session.id)}
                        onView={actions.onView}
                      />
                    )
                  )
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
