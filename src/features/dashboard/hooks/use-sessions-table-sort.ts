import { useState, useMemo } from 'react';
import { type TrainingSession } from '@/lib/types/session';
import { 
  parseDuration,
} from '@/lib/utils/duration';
import { extractHeartRateValue } from '@/lib/utils/formatters';


type SortColumn = 'sessionNumber' | 'week' | 'date' | 'sessionType' | 'duration' | 'distance' | 'avgPace' | 'avgHeartRate' | 'perceivedExertion';
type SortDirection = 'asc' | 'desc' | null;

export function useSessionsTableSort(sessions: TrainingSession[]) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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

  const sortedSessions = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return sessions;
    }

    return [...sessions].sort((a, b) => {
      let aValue: string | number | null | undefined;
      let bValue: string | number | null | undefined;

      switch (sortColumn as SortColumn) {
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
          if (a.status === 'planned') {
            aValue = a.targetDuration ? a.targetDuration * 60 : null;
          } else {
            aValue = parseDuration(a.duration);
          }
          if (b.status === 'planned') {
            bValue = b.targetDuration ? b.targetDuration * 60 : null;
          } else {
            bValue = parseDuration(b.duration);
          }
          break;
        case 'distance':
          if (a.status === 'planned') {
            aValue = a.targetDistance;
          } else {
            aValue = a.distance;
          }
          if (b.status === 'planned') {
            bValue = b.targetDistance;
          } else {
            bValue = b.distance;
          }
          break;
        case 'avgPace':
          if (a.status === 'planned') {
            aValue = parseDuration(a.targetPace);
          } else {
            aValue = parseDuration(a.avgPace);
          }
          if (b.status === 'planned') {
            bValue = parseDuration(b.targetPace);
          } else {
            bValue = parseDuration(b.avgPace);
          }
          break;
        case 'avgHeartRate':
          if (a.status === 'planned') {
            aValue = extractHeartRateValue(a.targetHeartRateBpm);
          } else {
            aValue = a.avgHeartRate;
          }
          if (b.status === 'planned') {
            bValue = extractHeartRateValue(b.targetHeartRateBpm);
          } else {
            bValue = b.avgHeartRate;
          }
          break;
        case 'perceivedExertion':
          if (a.status === 'planned') {
            aValue = a.targetRPE ?? null;
          } else {
            aValue = a.perceivedExertion ?? null;
          }
          if (b.status === 'planned') {
            bValue = b.targetRPE ?? null;
          } else {
            bValue = b.perceivedExertion ?? null;
          }
          break;
        default:
          return 0;
      }

      if ((aValue === null || aValue === undefined) && (bValue === null || bValue === undefined)) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (sortColumn === 'avgPace') {
        if (aValue < bValue) return sortDirection === 'desc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'desc' ? 1 : -1;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sessions, sortColumn, sortDirection]);

  return {
    sortColumn,
    sortDirection,
    handleSort,
    sortedSessions,
  };
}