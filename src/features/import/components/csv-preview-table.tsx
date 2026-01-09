import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { normalizeDurationFormat } from '@/lib/utils/duration';
import type { ParsedSession } from '@/lib/types/parser';

export type { ParsedSession };

interface CsvPreviewTableProps {
  preview: ParsedSession[];
  selectedIndices: Set<number>;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  mode?: 'create' | 'edit' | 'complete';
  onToggleSelect: (index: number) => void;
  onToggleSelectAll: () => void;
  onSort: (column: string) => void;
}

function SortIcon({ column, sortColumn, sortDirection }: { column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc' | null }) {
  if (sortColumn !== column) {
    return <ArrowUpDown className="mr-2 h-4 w-4" />;
  }
  if (sortDirection === 'desc') {
    return <ChevronDown className="mr-2 h-4 w-4 text-foreground" />;
  }
  return <ChevronUp className="mr-2 h-4 w-4 text-foreground" />;
}

export function CsvPreviewTable({
  preview,
  selectedIndices,
  sortColumn,
  sortDirection,
  mode,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
}: CsvPreviewTableProps) {
  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              {mode !== 'complete' && (
                <Checkbox
                  checked={preview.length > 0 && selectedIndices.size === preview.length}
                  onCheckedChange={onToggleSelectAll}
                />
              )}
            </TableHead>
            <TableHead className="text-center">Date</TableHead>
            <TableHead className="text-center">Séance</TableHead>
            <TableHead className="text-center">
              <button
                onClick={() => onSort('duration')}
                className="flex items-center justify-center hover:text-foreground transition-colors w-full"
              >
                <SortIcon column="duration" sortColumn={sortColumn} sortDirection={sortDirection} />
                <span className={sortColumn === 'duration' ? 'text-foreground' : ''}>Durée</span>
              </button>
            </TableHead>
            <TableHead className="text-center">
              <button
                onClick={() => onSort('distance')}
                className="flex items-center justify-center hover:text-foreground transition-colors w-full"
              >
                <SortIcon column="distance" sortColumn={sortColumn} sortDirection={sortDirection} />
                <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Distance</span>
              </button>
            </TableHead>
            <TableHead className="text-center">
              <button
                onClick={() => onSort('avgPace')}
                className="flex items-center justify-center hover:text-foreground transition-colors w-full"
              >
                <SortIcon column="avgPace" sortColumn={sortColumn} sortDirection={sortDirection} />
                <span className={sortColumn === 'avgPace' ? 'text-foreground' : ''}>Allure</span>
              </button>
            </TableHead>
            <TableHead className="text-center">
              <button
                onClick={() => onSort('avgHeartRate')}
                className="flex items-center justify-center hover:text-foreground transition-colors w-full"
              >
                <SortIcon column="avgHeartRate" sortColumn={sortColumn} sortDirection={sortDirection} />
                <span className={sortColumn === 'avgHeartRate' ? 'text-foreground' : ''}>FC</span>
              </button>
            </TableHead>
            <TableHead className="text-center">
              <button
                onClick={() => onSort('perceivedExertion')}
                className="flex items-center justify-center hover:text-foreground transition-colors w-full"
              >
                <SortIcon column="perceivedExertion" sortColumn={sortColumn} sortDirection={sortDirection} />
                <span className={sortColumn === 'perceivedExertion' ? 'text-foreground' : ''}>RPE</span>
              </button>
            </TableHead>
            <TableHead>Commentaires</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.map((session, originalIndex) => (
            <TableRow
              key={originalIndex}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onToggleSelect(originalIndex)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIndices.has(originalIndex)}
                  onCheckedChange={() => onToggleSelect(originalIndex)}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap text-center">
                {new Date(session.date).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center">
                  <span>{session.sessionType}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {normalizeDurationFormat(session.duration) || session.duration}
              </TableCell>
              <TableCell className="text-center">{session.distance.toFixed(2)} km</TableCell>
              <TableCell className="text-center">{session.avgPace}</TableCell>
              <TableCell className="text-center">{session.avgHeartRate}</TableCell>
              <TableCell className="text-center">
                {session.perceivedExertion ? (
                  <span
                    className={
                      session.perceivedExertion <= 3
                        ? 'text-green-500'
                        : session.perceivedExertion <= 6
                          ? 'text-yellow-500'
                          : session.perceivedExertion <= 8
                            ? 'text-orange-500'
                            : 'text-red-500 font-bold'
                    }
                  >
                    {session.perceivedExertion}/10
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <p className="truncate text-xs text-muted-foreground" title={session.comments}>
                  {session.comments}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
