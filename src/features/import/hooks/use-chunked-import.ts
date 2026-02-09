import { useState, useRef, useCallback } from 'react';
import { bulkImportSessions } from '@/lib/services/api-client';
import type { TrainingSessionPayload } from '@/lib/types';

export type ChunkedImportStatus = 'idle' | 'importing' | 'done' | 'error' | 'cancelled';

interface ChunkedImportProgress {
  imported: number;
  total: number;
}

interface ChunkedImportState {
  status: ChunkedImportStatus;
  progress: ChunkedImportProgress;
  importedIndices: Set<number>;
}

const BATCH_SIZE = 20;

export function useChunkedImport() {
  const [state, setState] = useState<ChunkedImportState>({
    status: 'idle',
    progress: { imported: 0, total: 0 },
    importedIndices: new Set(),
  });

  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState({
      status: 'idle',
      progress: { imported: 0, total: 0 },
      importedIndices: new Set(),
    });
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const start = useCallback(async (
    sessions: TrainingSessionPayload[],
    indices: number[],
  ): Promise<{ imported: number; total: number }> => {
    cancelledRef.current = false;
    const total = sessions.length;

    setState({
      status: 'importing',
      progress: { imported: 0, total },
      importedIndices: new Set(),
    });

    let imported = 0;
    const allImportedIndices = new Set<number>();

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (cancelledRef.current) {
        setState((prev) => ({ ...prev, status: 'cancelled' }));
        return { imported, total };
      }

      const batchSessions = sessions.slice(i, i + BATCH_SIZE);
      const batchIndices = indices.slice(i, i + BATCH_SIZE);

      try {
        const result = await bulkImportSessions(batchSessions);
        imported += result.count;
        for (const idx of batchIndices) allImportedIndices.add(idx);

        setState({
          status: 'importing',
          progress: { imported, total },
          importedIndices: new Set(allImportedIndices),
        });
      } catch {
        setState((prev) => ({
          ...prev,
          status: 'error',
          progress: { imported, total },
        }));
        return { imported, total };
      }
    }

    setState((prev) => ({
      ...prev,
      status: 'done',
      progress: { imported, total },
    }));

    return { imported, total };
  }, []);

  return {
    ...state,
    start,
    cancel,
    reset,
  };
}
