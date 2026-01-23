import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStravaActivities } from '../use-strava-activities';

const mockHandleError = vi.fn();

vi.mock('@/hooks/use-error-handler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}));

describe('useStravaActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useStravaActivities(false));

    expect(result.current.activities).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.isConnected).toBe(false);
  });

  it('should not fetch activities when dialog is closed', () => {
    renderHook(() => useStravaActivities(false));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch activities when dialog opens', async () => {
    const mockActivities = [
      {
        date: '2024-01-01',
        sessionType: '',
        duration: '00:30:00',
        distance: 5,
        avgPace: '06:00',
        avgHeartRate: 145,
        comments: 'Morning Run',
        externalId: '1',
        source: 'strava',
      },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ activities: mockActivities }),
    } as Response);

    const { result } = renderHook(() => useStravaActivities(true));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toEqual(mockActivities);
    expect(result.current.isConnected).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/strava/activities?page=1&per_page=20',
      expect.objectContaining({
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should handle 401 unauthorized error', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    const { result } = renderHook(() => useStravaActivities(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.activities).toEqual([]);
  });

  it('should handle 400 bad request error', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
    } as Response);

    const { result } = renderHook(() => useStravaActivities(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.activities).toEqual([]);
  });

  it('should handle fetch errors', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStravaActivities(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NETWORK_SERVER_ERROR' })
    );
  });

  it('should handle non-ok responses', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useStravaActivities(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockHandleError).toHaveBeenCalledWith(
      expect.any(Error)
    );
  });

  it('should reset state when dialog opens', async () => {
    const mockActivities = [
      {
        date: '2024-01-01',
        sessionType: '',
        duration: '00:30:00',
        distance: 5,
        avgPace: '06:00',
        avgHeartRate: null,
        comments: 'Run',
        externalId: '1',
        source: 'strava',
      },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ activities: mockActivities }),
    } as Response);

    const { result, rerender } = renderHook(
      ({ open }) => useStravaActivities(open),
      { initialProps: { open: false } }
    );

    rerender({ open: true });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    rerender({ open: false });

    rerender({ open: true });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should provide connectToStrava function', () => {
    const { result } = renderHook(() => useStravaActivities(false));

    expect(typeof result.current.connectToStrava).toBe('function');
  });

  it('should redirect to Strava auth when connectToStrava is called', () => {
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
      },
      writable: true,
    });

    const { result } = renderHook(() => useStravaActivities(false));

    const originalHref = window.location.href;
    result.current.connectToStrava();

    expect(window.location.href).toBe('/api/auth/strava/authorize');

    window.location.href = originalHref;
  });

  it('should handle empty activities array from API', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ activities: [] }),
    } as Response);

    const { result } = renderHook(() => useStravaActivities(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toEqual([]);
    expect(result.current.isConnected).toBe(true);
  });

  it('should provide loadAll function', () => {
    const { result } = renderHook(() => useStravaActivities(false));

    expect(typeof result.current.loadAll).toBe('function');
  });

  it('should provide loadMore function', () => {
    const { result } = renderHook(() => useStravaActivities(false));

    expect(typeof result.current.loadMore).toBe('function');
  });
});
