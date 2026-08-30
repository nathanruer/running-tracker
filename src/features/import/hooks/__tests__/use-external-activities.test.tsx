import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExternalActivities } from '../use-external-activities';
import * as apiClient from '@/lib/services/api-client';

vi.mock('@/lib/services/api-client', () => ({
  getIntervalsActivitiesList: vi.fn(),
}));

const mockHandleError = vi.fn();

vi.mock('@/hooks/use-error-handler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockActivity = {
  date: '2024-01-01',
  sessionType: '',
  duration: '00:30:00',
  distance: 5,
  avgPace: '06:00',
  avgHeartRate: 145,
  comments: 'Morning Run',
  externalId: '1',
  source: 'intervals_icu',
  startedAt: null,
  maxHeartRate: null,
  perceivedExertion: null,
  routePolyline: null,
  streams: null,
  sourcePayload: null,
  elevationGain: null,
  averageCadence: null,
  calories: null,
  alreadyImported: false,
};

describe('useExternalActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values when closed', () => {
    const { result } = renderHook(() => useExternalActivities(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.activities).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.isConnected).toBe(true);
  });

  it('should not fetch activities when dialog is closed', () => {
    renderHook(() => useExternalActivities(false), {
      wrapper: createWrapper(),
    });

    expect(apiClient.getIntervalsActivitiesList).not.toHaveBeenCalled();
  });

  it('should fetch activities when dialog opens', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList).mockResolvedValue({
      activities: [mockActivity],
      hasMore: false,
      totalCount: 1,
        nextCursor: null,
    });

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toEqual([mockActivity]);
    expect(result.current.isConnected).toBe(true);
    expect(apiClient.getIntervalsActivitiesList).toHaveBeenCalledTimes(1);
  });

  it('should flag missing configuration as not connected', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList).mockRejectedValue(
      new Error('intervals.icu non configuré : connecte ton compte depuis Profil → Compte.')
    );

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.activities).toEqual([]);
  });

  it('should stay connected on non-auth errors', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList).mockRejectedValue(
      new Error('500 Server Error')
    );

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    // Wait for the query to fail, then verify user stays connected
    await waitFor(() => {
      expect(apiClient.getIntervalsActivitiesList).toHaveBeenCalled();
    });

    // Non-auth errors should not disconnect the user
    expect(result.current.isConnected).toBe(true);
    expect(result.current.activities).toEqual([]);
  });

  it('should show cached activities instantly and refetch in background (SWR)', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList).mockResolvedValue({
      activities: [mockActivity],
      hasMore: false,
      totalCount: 1,
        nextCursor: null,
    });

    const { result, rerender } = renderHook(
      ({ open }) => useExternalActivities(open),
      { initialProps: { open: true }, wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
    });

    rerender({ open: false });
    rerender({ open: true });

    // Cache is shown instantly - activities available immediately
    expect(result.current.activities).toEqual([mockActivity]);

    // Background refetch happens (SWR pattern)
    await waitFor(() => {
      expect(apiClient.getIntervalsActivitiesList).toHaveBeenCalledTimes(2);
    });
  });

  it('should reload when refresh is called', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList).mockResolvedValue({
      activities: [mockActivity],
      hasMore: false,
      totalCount: 1,
        nextCursor: null,
    });

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(apiClient.getIntervalsActivitiesList).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(apiClient.getIntervalsActivitiesList).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle empty activities array from API', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList).mockResolvedValue({
      activities: [],
      hasMore: false,
      totalCount: 0,
        nextCursor: null,
    });

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toEqual([]);
    expect(result.current.isConnected).toBe(true);
  });

  it('should provide loadMore function', () => {
    const { result } = renderHook(() => useExternalActivities(false), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.loadMore).toBe('function');
  });

  it('should load more activities when loadMore is called', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList)
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: true,
        totalCount: 2,
        nextCursor: '1704067200',
      })
      .mockResolvedValueOnce({
        activities: [{ ...mockActivity, externalId: '2' }],
        hasMore: false,
        totalCount: 2,
        nextCursor: null,
      });

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(2);
    });

    expect(apiClient.getIntervalsActivitiesList).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate activities with same externalId', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList)
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: true,
        totalCount: 2,
        nextCursor: '1704067200',
      })
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: false,
        totalCount: 2,
        nextCursor: null,
      });

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    expect(result.current.activities).toHaveLength(1);
  });

  it('should provide search loading state', () => {
    const { result } = renderHook(() => useExternalActivities(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.searchLoading).toBe(false);
    expect(result.current.searchProgress).toEqual({ loaded: 0, total: 0 });
  });

  it('should provide cancelLoading function', () => {
    const { result } = renderHook(() => useExternalActivities(false), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.cancelLoading).toBe('function');
  });

  it('should load all activities when loadAllActivities is called', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList)
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: true,
        totalCount: 2,
        nextCursor: '1704067200',
      })
      .mockResolvedValueOnce({
        activities: [{ ...mockActivity, externalId: '2' }],
        hasMore: false,
        totalCount: 2,
        nextCursor: null,
      });

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadAllActivities();
    });

    expect(result.current.activities).toHaveLength(2);
  });

  it('should stop search when match is found', async () => {
    vi.mocked(apiClient.getIntervalsActivitiesList)
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: true,
        totalCount: 2,
        nextCursor: '1704067200',
      })
      .mockResolvedValueOnce({
        activities: [{ ...mockActivity, externalId: '2', comments: 'match here' }],
        hasMore: true,
        totalCount: 2,
        nextCursor: '1704000000',
      });

    const { result } = renderHook(() => useExternalActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadAllForSearch('match');
    });

    expect(result.current.searchLoading).toBe(false);
  });

});
