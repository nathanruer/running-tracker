import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChunkedImport } from '../use-chunked-import';

const mockBulkImportSessions = vi.fn();

vi.mock('@/lib/services/api-client', () => ({
  bulkImportSessions: (...args: unknown[]) => mockBulkImportSessions(...args),
}));

function makeSession(i: number) {
  return {
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    sessionType: null,
    duration: '00:30:00',
    distance: 5,
    avgPace: '06:00',
    avgHeartRate: null,
    perceivedExertion: null,
    comments: `Run ${i}`,
    externalId: `ext-${i}`,
    source: 'strava',
    stravaData: null,
    elevationGain: null,
    averageCadence: null,
    averageTemp: null,
    calories: null,
  };
}

describe('useChunkedImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkImportSessions.mockResolvedValue({ count: 20, message: 'ok' });
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useChunkedImport());

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toEqual({ imported: 0, total: 0 });
    expect(result.current.importedIndices.size).toBe(0);
  });

  it('imports a single batch', async () => {
    const { result } = renderHook(() => useChunkedImport());

    const sessions = Array.from({ length: 5 }, (_, i) => makeSession(i));
    const indices = [0, 1, 2, 3, 4];

    let importResult: { imported: number; total: number } | undefined;
    await act(async () => {
      importResult = await result.current.start(sessions, indices);
    });

    expect(mockBulkImportSessions).toHaveBeenCalledTimes(1);
    expect(mockBulkImportSessions).toHaveBeenCalledWith(sessions);
    expect(importResult).toEqual({ imported: 20, total: 5 });
    expect(result.current.status).toBe('done');
    expect(result.current.progress).toEqual({ imported: 20, total: 5 });
    expect(result.current.importedIndices).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('splits into multiple batches of 20', async () => {
    mockBulkImportSessions
      .mockResolvedValueOnce({ count: 20, message: 'ok' })
      .mockResolvedValueOnce({ count: 20, message: 'ok' })
      .mockResolvedValueOnce({ count: 5, message: 'ok' });

    const { result } = renderHook(() => useChunkedImport());

    const sessions = Array.from({ length: 45 }, (_, i) => makeSession(i));
    const indices = Array.from({ length: 45 }, (_, i) => i);

    await act(async () => {
      await result.current.start(sessions, indices);
    });

    expect(mockBulkImportSessions).toHaveBeenCalledTimes(3);
    expect(mockBulkImportSessions).toHaveBeenNthCalledWith(1, sessions.slice(0, 20));
    expect(mockBulkImportSessions).toHaveBeenNthCalledWith(2, sessions.slice(20, 40));
    expect(mockBulkImportSessions).toHaveBeenNthCalledWith(3, sessions.slice(40, 45));
    expect(result.current.status).toBe('done');
    expect(result.current.progress).toEqual({ imported: 45, total: 45 });
  });

  it('stops on error and keeps partial progress', async () => {
    mockBulkImportSessions
      .mockResolvedValueOnce({ count: 20, message: 'ok' })
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useChunkedImport());

    const sessions = Array.from({ length: 40 }, (_, i) => makeSession(i));
    const indices = Array.from({ length: 40 }, (_, i) => i);

    await act(async () => {
      await result.current.start(sessions, indices);
    });

    expect(mockBulkImportSessions).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('error');
    expect(result.current.progress).toEqual({ imported: 20, total: 40 });
    expect(result.current.importedIndices).toEqual(new Set(Array.from({ length: 20 }, (_, i) => i)));
  });

  it('cancels after current batch', async () => {
    let resolveSecondBatch: ((v: { count: number; message: string }) => void) | undefined;
    mockBulkImportSessions
      .mockResolvedValueOnce({ count: 20, message: 'ok' })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecondBatch = resolve; }));

    const { result } = renderHook(() => useChunkedImport());

    const sessions = Array.from({ length: 60 }, (_, i) => makeSession(i));
    const indices = Array.from({ length: 60 }, (_, i) => i);

    let startPromise: Promise<{ imported: number; total: number }>;
    await act(async () => {
      startPromise = result.current.start(sessions, indices);
    });

    act(() => {
      result.current.cancel();
    });

    await act(async () => {
      resolveSecondBatch!({ count: 20, message: 'ok' });
      await startPromise!;
    });

    expect(result.current.status).toBe('cancelled');
    expect(result.current.progress.imported).toBe(40);
  });

  it('resets state', async () => {
    const { result } = renderHook(() => useChunkedImport());

    const sessions = Array.from({ length: 5 }, (_, i) => makeSession(i));
    const indices = [0, 1, 2, 3, 4];

    await act(async () => {
      await result.current.start(sessions, indices);
    });

    expect(result.current.status).toBe('done');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toEqual({ imported: 0, total: 0 });
    expect(result.current.importedIndices.size).toBe(0);
  });
});
