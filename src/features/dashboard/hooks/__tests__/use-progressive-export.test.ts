import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProgressiveExport } from '../use-progressive-export';

vi.mock('@/lib/services/api-client', () => ({
  getSessions: vi.fn(),
  getSessionsCount: vi.fn(),
}));

import { getSessions, getSessionsCount } from '@/lib/services/api-client';

describe('useProgressiveExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useProgressiveExport());

    expect(result.current.exportProgress).toEqual({
      isExporting: false,
      progress: 0,
      loadedCount: 0,
      totalCount: 0,
      error: null,
    });
  });

  it('should provide fetchAllSessionsWithProgress function', () => {
    const { result } = renderHook(() => useProgressiveExport());

    expect(typeof result.current.fetchAllSessionsWithProgress).toBe('function');
  });

  it('should provide resetProgress function', () => {
    const { result } = renderHook(() => useProgressiveExport());

    expect(typeof result.current.resetProgress).toBe('function');
  });

  it('should return empty array when count is 0', async () => {
    vi.mocked(getSessionsCount).mockResolvedValue(0);

    const { result } = renderHook(() => useProgressiveExport());

    let sessions: unknown[] = [];
    await act(async () => {
      sessions = await result.current.fetchAllSessionsWithProgress();
    });

    expect(sessions).toEqual([]);
    expect(getSessionsCount).toHaveBeenCalled();
    expect(getSessions).not.toHaveBeenCalled();
  });

  it('should fetch sessions in chunks and update progress', async () => {
    const mockSessions = Array.from({ length: 50 }, (_, i) => ({
      id: `session-${i}`,
      date: '2024-01-01',
      sessionType: 'Test',
    })) as unknown[];

    vi.mocked(getSessionsCount).mockResolvedValue(50);
    vi.mocked(getSessions).mockResolvedValue(mockSessions as never);

    const { result } = renderHook(() => useProgressiveExport());

    await act(async () => {
      await result.current.fetchAllSessionsWithProgress();
    });

    expect(getSessionsCount).toHaveBeenCalledWith(undefined, undefined, undefined);
    expect(getSessions).toHaveBeenCalled();
    expect(result.current.exportProgress.progress).toBe(100);
    expect(result.current.exportProgress.isExporting).toBe(false);
  });

  it('should set isExporting to true during fetch', async () => {
    vi.mocked(getSessionsCount).mockResolvedValue(100);
    vi.mocked(getSessions).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 50))
    );

    const { result } = renderHook(() => useProgressiveExport());

    act(() => {
      result.current.fetchAllSessionsWithProgress();
    });

    await waitFor(() => {
      expect(result.current.exportProgress.isExporting).toBe(true);
    });
  });

  it('should pass type, search, and dateFrom to API calls', async () => {
    vi.mocked(getSessionsCount).mockResolvedValue(10);
    vi.mocked(getSessions).mockResolvedValue([]);

    const { result } = renderHook(() => useProgressiveExport());

    await act(async () => {
      await result.current.fetchAllSessionsWithProgress('running', 'marathon', '2024-01-01');
    });

    expect(getSessionsCount).toHaveBeenCalledWith('running', 'marathon', '2024-01-01');
    expect(getSessions).toHaveBeenCalledWith(
      100,
      0,
      'running',
      undefined,
      'marathon',
      '2024-01-01'
    );
  });

  it('should reset progress when resetProgress is called', async () => {
    vi.mocked(getSessionsCount).mockResolvedValue(10);
    vi.mocked(getSessions).mockResolvedValue([{ id: '1' }] as never);

    const { result } = renderHook(() => useProgressiveExport());

    await act(async () => {
      await result.current.fetchAllSessionsWithProgress();
    });

    expect(result.current.exportProgress.progress).toBe(100);

    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.exportProgress).toEqual({
      isExporting: false,
      progress: 0,
      loadedCount: 0,
      totalCount: 0,
      error: null,
    });
  });

  it('should throw and set error state when fetch fails', async () => {
    vi.mocked(getSessionsCount).mockRejectedValue(new Error('Network error'));

    const { result, unmount } = renderHook(() => useProgressiveExport());

    let thrownError: Error | undefined;

    await act(async () => {
      try {
        await result.current.fetchAllSessionsWithProgress();
      } catch (err) {
        thrownError = err as Error;
      }
    });

    expect(thrownError!.message).toBe('Network error');
    expect(result.current.exportProgress.error).toBe('Network error');
    expect(result.current.exportProgress.isExporting).toBe(false);

    unmount();
  });
});
