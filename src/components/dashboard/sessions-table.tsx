import { useState } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { ExportSessions } from './export-sessions';
import { PlannedSessionRow } from './planned-session-row';
import { CompletedSessionRow } from './completed-session-row';
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
  initialLoading,
}: SessionsTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortedSessions = () => {
    if (!sortColumn || !sortDirection) {
      return sessions;
    }

    return [...sessions].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortColumn) {
        case 'sessionNumber':
          aValue = a.sessionNumber;
          bValue = b.sessionNumber;
          break;
        case 'week':
          aValue = a.week;
          bValue = b.week;
          break;
        case 'date':
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
          break;
        case 'sessionType':
          aValue = a.sessionType.toLowerCase();
          bValue = b.sessionType.toLowerCase();
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'distance':
          aValue = a.distance;
          bValue = b.distance;
          break;
        case 'avgPace':
          aValue = a.avgPace;
          bValue = b.avgPace;
          break;
        case 'avgHeartRate':
          aValue = a.avgHeartRate;
          bValue = b.avgHeartRate;
          break;
        case 'perceivedExertion':
          aValue = a.perceivedExertion ?? 0;
          bValue = b.perceivedExertion ?? 0;
          break;
        default:
          return 0;
      }

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === null) return sortDirection === 'asc' ? -1 : 1;
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="mr-2 h-4 w-4" />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="mr-2 h-4 w-4 text-foreground" />;
    }
    return <ChevronUp className="mr-2 h-4 w-4 text-foreground" />;
  };

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const allVisibleSessions = getSortedSessions();
    if (selectedSessions.size === allVisibleSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(allVisibleSessions.map(s => s.id)));
    }
  };

  const clearSelection = () => {
    setSelectedSessions(new Set());
  };

  const handleBulkDelete = async () => {
    setIsDeletingBulk(true);
    try {
      await onBulkDelete(Array.from(selectedSessions));

      setSelectedSessions(new Set());
      setShowBulkDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting sessions:', error);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const allVisibleSessionsCount = getSortedSessions().length;
  const allSelected = selectedSessions.size > 0 && selectedSessions.size === allVisibleSessionsCount;

  return (
    <>
    <Card className="border-border/50">
      <CardHeader className="flex flex-col gap-4 space-y-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl font-bold">Historique des séances</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
        </div>

        {selectedSessions.size > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-md bg-muted/40 border border-border p-2 pl-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {selectedSessions.size} séance{selectedSessions.size > 1 ? 's' : ''} sélectionnée{selectedSessions.size > 1 ? 's' : ''}
              </span>
              <div className="h-4 w-[1px] bg-border" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearSelection}
                className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-transparent"
              >
                Annuler
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="h-8 px-3 text-xs"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Supprimer
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
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
                    <SortIcon column="duration" />
                    <span className={sortColumn === 'duration' ? 'text-foreground' : ''}>Durée</span>
                  </button>
                </TableHead>
                <TableHead className="w-24 text-center">
                  <button
                    onClick={() => handleSort('distance')}
                    className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                  >
                    <SortIcon column="distance" />
                    <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Dist.</span>
                  </button>
                </TableHead>
                <TableHead className="w-32 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleSort('avgPace')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      <SortIcon column="avgPace" />
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
                      <SortIcon column="avgHeartRate" />
                      <span className={sortColumn === 'avgHeartRate' ? 'text-foreground' : ''}>FC</span>
                    </button>
                  </div>
                </TableHead>
                <TableHead className="w-12 text-center">
                  <button
                    onClick={() => handleSort('perceivedExertion')}
                    className="flex items-center justify-center w-full hover:text-foreground transition-colors"
                  >
                    <SortIcon column="perceivedExertion" />
                    <span className={sortColumn === 'perceivedExertion' ? 'text-foreground' : ''}>RPE</span>
                  </button>
                </TableHead>
                <TableHead className="min-w-[200px]">Commentaires</TableHead>
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
                getSortedSessions().map((session) =>
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
            onClick={handleBulkDelete}
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
