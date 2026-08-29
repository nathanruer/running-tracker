import { apiRequest } from './client';

const IMPORT_TIMEOUT_MS = 120_000;

export interface IntervalsImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export async function importFromIntervals(): Promise<IntervalsImportResult> {
  return apiRequest<IntervalsImportResult>(
    '/api/intervals/import',
    { method: 'POST' },
    IMPORT_TIMEOUT_MS
  );
}
