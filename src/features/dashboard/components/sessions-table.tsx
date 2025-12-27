import { Plus } from 'lucide-react';
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

interface SessionsTableProps {
  sessions: TrainingSession[];
  availableTypes: string[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  viewMode: 'paginated' | 'all';
  onViewModeChange: (mode: 'paginated' | 'all') => void;
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onNewSession?: () => void;
  initialLoading: boolean;
}

export function SessionsTable({
  sessions,
  availableTypes,
  selectedType,
  onTypeChange,
  viewMode,
  onViewModeChange,
  onEdit,
  onDelete,
  onBulkDelete,
  onNewSession,
  initialLoading,
}: SessionsTableProps) {
  const { sortColumn, sortDirection, handleSort, getSortedSessions } = useSessionsTableSort(sessions);
  const { selectedSessions, toggleSessionSelection, toggleSelectAll, clearSelection, isAllSelected } = useSessionsSelection(getSortedSessions());
  const { showBulkDeleteDialog, setShowBulkDeleteDialog, isDeletingBulk, handleBulkDelete } = useBulkDelete(onBulkDelete);

  const sortedSessions = getSortedSessions();

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="flex flex-col gap-4 space-y-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Historique des séances</CardTitle>
            {onNewSession && (
              <Button
                onClick={onNewSession}
                className="gradient-violet shrink-0"
                title="Nouvelle séance"
              >
                <Plus />
                <span className="hidden md:inline">Ajouter une séance</span>
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedType} onValueChange={onTypeChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Affichage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paginated">10 dernières</SelectItem>
                <SelectItem value="all">Tout afficher</SelectItem>
              </SelectContent>
            </Select>
            <ExportSessions
              selectedType={selectedType}
              selectedSessions={selectedSessions}
              allSessions={sessions}
            />
          </div>

          {selectedSessions.size > 0 && (
            <SelectionBar
              selectedCount={selectedSessions.size}
              onClear={clearSelection}
              onDelete={() => setShowBulkDeleteDialog(true)}
            />
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      className="border-muted-foreground/50 data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
                      aria-label="Sélectionner toutes les séances"
                    />
                  </TableHead>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="w-14 text-center">Sem.</TableHead>
                  <TableHead className="w-24 text-center">Date</TableHead>
                  <TableHead className="min-w-[112px] text-center">Séance</TableHead>
                  <TableHead className="w-20 text-center">
                    <button
                      onClick={() => handleSort('duration')}
                      className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                    >
                      <SortIcon column="duration" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={sortColumn === 'duration' ? 'text-foreground' : ''}>Durée</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-24 text-center">
                    <button
                      onClick={() => handleSort('distance')}
                      className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                    >
                      <SortIcon column="distance" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Dist.</span>
                    </button>
                  </TableHead>
                  <TableHead className="w-32 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleSort('avgPace')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        <SortIcon column="avgPace" sortColumn={sortColumn} sortDirection={sortDirection} />
                        <span className={sortColumn === 'avgPace' ? 'text-foreground' : ''}>Allure</span>
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="w-20 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleSort('avgHeartRate')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        <SortIcon column="avgHeartRate" sortColumn={sortColumn} sortDirection={sortDirection} />
                        <span className={sortColumn === 'avgHeartRate' ? 'text-foreground' : ''}>FC</span>
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="w-12 text-center">
                    <button
                      onClick={() => handleSort('perceivedExertion')}
                      className="flex items-center justify-center w-full hover:text-foreground transition-colors"
                    >
                      <SortIcon column="perceivedExertion" sortColumn={sortColumn} sortDirection={sortDirection} />
                      <span className={sortColumn === 'perceivedExertion' ? 'text-foreground' : ''}>RPE</span>
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[250px] xl:min-w-[350px] 2xl:min-w-[450px]">Commentaires</TableHead>
                  <TableHead className="w-16 text-center">Actions</TableHead>
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
                      <TableCell><div className="h-10 w-full animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <div className="h-8 w-8 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                          <div className="h-8 w-8 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  sortedSessions.map((session) =>
                    session.status === 'planned' ? (
                      <PlannedSessionRow
                        key={session.id}
                        session={session}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        showCheckbox={true}
                        isSelected={selectedSessions.has(session.id)}
                        onToggleSelect={() => toggleSessionSelection(session.id)}
                      />
                    ) : (
                      <CompletedSessionRow
                        key={session.id}
                        session={session}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        showCheckbox={true}
                        isSelected={selectedSessions.has(session.id)}
                        onToggleSelect={() => toggleSessionSelection(session.id)}
                      />
                    )
                  )
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBulk}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkDelete(Array.from(selectedSessions), clearSelection)}
              disabled={isDeletingBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingBulk ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
