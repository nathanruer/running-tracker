import { useState, useRef, useCallback } from 'react';
import { bulkImportSessions } from '@/lib/services/api-client';
import type { TrainingSessionPayload } from '@/lib/types';

export type ChunkedImportStatus = 'idle' | 'importing' | 'done' | 'error' | 'cancelled';

interface ChunkedImportProgress {
  imported: number;
  skipped: number;
  total: number;
}

interface ChunkedImportState {
  status: ChunkedImportStatus;
  progress: ChunkedImportProgress;
  importedKeys: Set<string>;
}

const BATCH_SIZE = 20;

export function useChunkedImport() {
  const [state, setState] = useState<ChunkedImportState>({
    status: 'idle',
    progress: { imported: 0, skipped: 0, total: 0 },
    importedKeys: new Set(),
  });

  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState({
      status: 'idle',
      progress: { imported: 0, skipped: 0, total: 0 },
      importedKeys: new Set(),
    });
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const start = useCallback(async (
    sessions: TrainingSessionPayload[],
    externalIds: string[],
  ): Promise<{ imported: number; skipped: number; total: number }> => {
    cancelledRef.current = false;
    const total = sessions.length;

    setState({
      status: 'importing',
      progress: { imported: 0, skipped: 0, total },
      importedKeys: new Set(),
    });

    let imported = 0;
    let skipped = 0;
    const allImportedKeys = new Set<string>();

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (cancelledRef.current) {
        setState((prev) => ({ ...prev, status: 'cancelled' }));
        return { imported, skipped, total };
      }

      const batchSessions = sessions.slice(i, i + BATCH_SIZE);
      const batchKeys = externalIds.slice(i, i + BATCH_SIZE);

      try {
        const result = await bulkImportSessions(batchSessions);
        imported += result.count;
        skipped += result.skipped ?? 0;
        for (const key of batchKeys) allImportedKeys.add(key);

        setState({
          status: 'importing',
          progress: { imported, skipped, total },
          importedKeys: new Set(allImportedKeys),
        });
      } catch {
        setState((prev) => ({
          ...prev,
          status: 'error',
          progress: { imported, skipped, total },
        }));
        return { imported, skipped, total };
      }
    }

    setState((prev) => ({
      ...prev,
      status: 'done',
      progress: { imported, skipped, total },
    }));

    return { imported, skipped, total };
  }, []);

  return {
    ...state,
    start,
    cancel,
    reset,
  };
}
