import { useState } from 'react';
import { type TrainingSession } from '@/lib/types';

export function useSessionsSelection(sessions: TrainingSession[]) {
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

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
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.id)));
    }
  };

  const clearSelection = () => {
    setSelectedSessions(new Set());
  };

  const isAllSelected = selectedSessions.size > 0 && selectedSessions.size === sessions.length;

  return {
    selectedSessions,
    toggleSessionSelection,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
  };
}
