import { useState, useCallback } from 'react';
import { getSessions, getSessionsCount } from '@/lib/services/api-client';
import type { TrainingSession } from '@/lib/types';

const CHUNK_SIZE = 100;

export interface ExportProgress {
  isExporting: boolean;
  progress: number;
  loadedCount: number;
  totalCount: number;
  error: string | null;
}

export function useProgressiveExport() {
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
    loadedCount: 0,
    totalCount: 0,
    error: null,
  });

  const fetchAllSessionsWithProgress = useCallback(
    async (
      type?: string,
      search?: string,
      dateFrom?: string
    ): Promise<TrainingSession[]> => {
      try {
        const totalCount = await getSessionsCount(type, search, dateFrom);

        if (totalCount === 0) {
          return [];
        }

        setExportProgress({
          isExporting: true,
          progress: 0,
          loadedCount: 0,
          totalCount,
          error: null,
        });

        const allSessions: TrainingSession[] = [];
        let offset = 0;

        while (offset < totalCount) {
          const chunk = await getSessions(CHUNK_SIZE, offset, type, undefined, search, dateFrom);

          if (chunk.length === 0) break;

          allSessions.push(...chunk);
          offset += chunk.length;

          const progress = Math.round((allSessions.length / totalCount) * 100);

          setExportProgress({
            isExporting: true,
            progress,
            loadedCount: allSessions.length,
            totalCount,
            error: null,
          });
        }

        setExportProgress({
          isExporting: false,
          progress: 100,
          loadedCount: allSessions.length,
          totalCount,
          error: null,
        });

        return allSessions;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement';
        setExportProgress((prev) => ({
          ...prev,
          isExporting: false,
          error: errorMessage,
        }));
        throw err;
      }
    },
    []
  );

  const resetProgress = useCallback(() => {
    setExportProgress({
      isExporting: false,
      progress: 0,
      loadedCount: 0,
      totalCount: 0,
      error: null,
    });
  }, []);

  return {
    exportProgress,
    fetchAllSessionsWithProgress,
    resetProgress,
  };
}
