import { useState } from 'react';
import { type TrainingSession } from '@/lib/types';

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

  const getSortedSessions = () => {
    if (!sortColumn || !sortDirection) {
      return sessions;
    }

    return [...sessions].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

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

  return {
    sortColumn,
    sortDirection,
    handleSort,
    getSortedSessions,
  };
}
