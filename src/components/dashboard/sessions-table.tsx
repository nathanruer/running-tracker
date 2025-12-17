import { useState } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import { ExportSessions } from './export-sessions';
import { PlannedSessionRow } from './planned-session-row';
import { CompletedSessionRow } from './completed-session-row';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  initialLoading,
}: SessionsTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

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
      let aValue: any;
      let bValue: any;

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

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
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
          <ExportSessions sessions={sessions} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-16 text-center">Sem.</TableHead>
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
                <TableHead className="w-20 text-center">
                  <button
                    onClick={() => handleSort('distance')}
                    className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                  >
                    <SortIcon column="distance" />
                    <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Dist.</span>
                  </button>
                </TableHead>
                <TableHead className="w-20 text-center">
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
                <TableHead className="w-14 text-center">
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
                <TableHead className="w-14 text-center">
                  <button
                    onClick={() => handleSort('perceivedExertion')}
                    className="flex items-center justify-center w-full hover:text-foreground transition-colors"
                  >
                    <SortIcon column="perceivedExertion" />
                    <span className={sortColumn === 'perceivedExertion' ? 'text-foreground' : ''}>RPE</span>
                  </button>
                </TableHead>
                <TableHead>Commentaires</TableHead>
                <TableHead className="w-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
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
                    />
                  ) : (
                    <CompletedSessionRow
                      key={session.id}
                      session={session}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  )
                )
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
