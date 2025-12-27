import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStravaActivities } from '../use-strava-activities';

const mockHandleError = vi.fn();

vi.mock('@/hooks/use-api-error-handler', () => ({
  useApiErrorHandler: () => ({
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
        id: 1,
        name: 'Morning Run',
        distance: 5000,
        moving_time: 1800,
        start_date_local: '2024-01-01T08:00:00Z',
        type: 'Run',
        average_heartrate: 145,
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
    expect(global.fetch).toHaveBeenCalledWith('/api/strava/activities');
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
    const mockError = new Error('Network error');
    vi.mocked(global.fetch).mockRejectedValue(mockError);

    const { result } = renderHook(() => useStravaActivities(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockHandleError).toHaveBeenCalledWith(
      mockError,
      'Impossible de récupérer les activités Strava'
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
      expect.any(Error),
      'Impossible de récupérer les activités Strava'
    );
  });

  it('should reset state when dialog opens', async () => {
    const mockActivities = [
      {
        id: 1,
        name: 'Run',
        distance: 5000,
        moving_time: 1800,
        start_date_local: '2024-01-01T08:00:00Z',
        type: 'Run',
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

    // First, load activities
    rerender({ open: true });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Close dialog
    rerender({ open: false });

    // Reopen - should reset and fetch again
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

    // Restore
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

  it('should provide loadActivities function for manual refresh', async () => {
    const mockActivities = [
      {
        id: 1,
        name: 'Run',
        distance: 5000,
        moving_time: 1800,
        start_date_local: '2024-01-01T08:00:00Z',
        type: 'Run',
      },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ activities: mockActivities }),
    } as Response);

    const { result } = renderHook(() => useStravaActivities(false));

    expect(result.current.loading).toBe(false);

    // Manually load activities
    await result.current.loadActivities();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.activities).toEqual(mockActivities);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/strava/activities');
  });
});
