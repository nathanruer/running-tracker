import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStravaActivities } from '../use-strava-activities';
import * as apiClient from '@/lib/services/api-client';

vi.mock('@/lib/services/api-client', () => ({
  getStravaActivities: vi.fn(),
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
  source: 'strava',
};

describe('useStravaActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values when closed', () => {
    const { result } = renderHook(() => useStravaActivities(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.activities).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.isConnected).toBe(true);
  });

  it('should not fetch activities when dialog is closed', () => {
    renderHook(() => useStravaActivities(false), {
      wrapper: createWrapper(),
    });

    expect(apiClient.getStravaActivities).not.toHaveBeenCalled();
  });

  it('should fetch activities when dialog opens', async () => {
    vi.mocked(apiClient.getStravaActivities).mockResolvedValue({
      activities: [mockActivity],
      hasMore: false,
      totalCount: 1,
    });

    const { result } = renderHook(() => useStravaActivities(true), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toEqual([mockActivity]);
    expect(result.current.isConnected).toBe(true);
    expect(apiClient.getStravaActivities).toHaveBeenCalledWith(30, undefined);
  });

  it('should handle 401 unauthorized error', async () => {
    vi.mocked(apiClient.getStravaActivities).mockRejectedValue(
      new Error('401 Unauthorized')
    );

    const { result } = renderHook(() => useStravaActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.activities).toEqual([]);
  });

  it('should handle 400 bad request error', async () => {
    vi.mocked(apiClient.getStravaActivities).mockRejectedValue(
      new Error('400 Bad Request')
    );

    const { result } = renderHook(() => useStravaActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.activities).toEqual([]);
  });

  it('should stay connected on non-auth errors', async () => {
    vi.mocked(apiClient.getStravaActivities).mockRejectedValue(
      new Error('500 Server Error')
    );

    const { result } = renderHook(() => useStravaActivities(true), {
      wrapper: createWrapper(),
    });

    // Wait for the query to fail, then verify user stays connected
    await waitFor(() => {
      expect(apiClient.getStravaActivities).toHaveBeenCalled();
    });

    // Non-auth errors should not disconnect the user
    expect(result.current.isConnected).toBe(true);
    expect(result.current.activities).toEqual([]);
  });

  it('should show cached activities instantly and refetch in background (SWR)', async () => {
    vi.mocked(apiClient.getStravaActivities).mockResolvedValue({
      activities: [mockActivity],
      hasMore: false,
      totalCount: 1,
    });

    const { result, rerender } = renderHook(
      ({ open }) => useStravaActivities(open),
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
      expect(apiClient.getStravaActivities).toHaveBeenCalledTimes(2);
    });
  });

  it('should reload when refresh is called', async () => {
    vi.mocked(apiClient.getStravaActivities).mockResolvedValue({
      activities: [mockActivity],
      hasMore: false,
      totalCount: 1,
    });

    const { result } = renderHook(() => useStravaActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(apiClient.getStravaActivities).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(apiClient.getStravaActivities).toHaveBeenCalledTimes(2);
    });
  });

  it('should provide connectToStrava function', () => {
    const { result } = renderHook(() => useStravaActivities(false), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.connectToStrava).toBe('function');
  });

  it('should redirect to Strava auth when connectToStrava is called', () => {
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    const { result } = renderHook(() => useStravaActivities(false), {
      wrapper: createWrapper(),
    });

    result.current.connectToStrava();

    expect(window.location.href).toBe('/api/auth/strava/authorize');
  });

  it('should handle empty activities array from API', async () => {
    vi.mocked(apiClient.getStravaActivities).mockResolvedValue({
      activities: [],
      hasMore: false,
      totalCount: 0,
    });

    const { result } = renderHook(() => useStravaActivities(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toEqual([]);
    expect(result.current.isConnected).toBe(true);
  });

  it('should provide loadMore function', () => {
    const { result } = renderHook(() => useStravaActivities(false), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.loadMore).toBe('function');
  });

  it('should load more activities when loadMore is called', async () => {
    vi.mocked(apiClient.getStravaActivities)
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: true,
        totalCount: 2,
        nextCursor: 1704067200,
      })
      .mockResolvedValueOnce({
        activities: [{ ...mockActivity, externalId: '2' }],
        hasMore: false,
        totalCount: 2,
      });

    const { result } = renderHook(() => useStravaActivities(true), {
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

    expect(apiClient.getStravaActivities).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate activities with same externalId', async () => {
    vi.mocked(apiClient.getStravaActivities)
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: true,
        totalCount: 2,
        nextCursor: 1704067200,
      })
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: false,
        totalCount: 2,
      });

    const { result } = renderHook(() => useStravaActivities(true), {
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
    const { result } = renderHook(() => useStravaActivities(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.searchLoading).toBe(false);
    expect(result.current.searchProgress).toEqual({ loaded: 0, total: 0 });
  });

  it('should provide cancelLoading function', () => {
    const { result } = renderHook(() => useStravaActivities(false), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.cancelLoading).toBe('function');
  });

  it('should load all activities when loadAllActivities is called', async () => {
    vi.mocked(apiClient.getStravaActivities)
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: true,
        totalCount: 2,
        nextCursor: 1704067200,
      })
      .mockResolvedValueOnce({
        activities: [{ ...mockActivity, externalId: '2' }],
        hasMore: false,
        totalCount: 2,
      });

    const { result } = renderHook(() => useStravaActivities(true), {
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
    vi.mocked(apiClient.getStravaActivities)
      .mockResolvedValueOnce({
        activities: [mockActivity],
        hasMore: true,
        totalCount: 2,
        nextCursor: 1704067200,
      })
      .mockResolvedValueOnce({
        activities: [{ ...mockActivity, externalId: '2', comments: 'match here' }],
        hasMore: true,
        totalCount: 2,
        nextCursor: 1704000000,
      });

    const { result } = renderHook(() => useStravaActivities(true), {
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
