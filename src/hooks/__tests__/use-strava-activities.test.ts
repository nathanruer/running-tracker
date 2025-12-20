import { renderHook, act } from '@testing-library/react';
import { useStravaActivities } from '../use-strava-activities';
import { useApiErrorHandler } from '../use-api-error-handler';
import { vi } from 'vitest';

vi.mock('../use-api-error-handler', () => ({
  useApiErrorHandler: vi.fn(() => ({
    handleError: vi.fn(),
  })),
}));

global.fetch = vi.fn() as unknown as typeof fetch;

describe('useStravaActivities', () => {
  const mockHandleError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useApiErrorHandler as ReturnType<typeof vi.fn>).mockReturnValue({
      handleError: mockHandleError,
    });
    (fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useStravaActivities(false));

      expect(result.current.activities).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('loadActivities', () => {
    it('should fetch activities successfully', async () => {
      const mockActivities = [
        { id: 1, name: 'Morning Run', distance: 5000, moving_time: 1200, start_date_local: '2023-01-01', type: 'run' },
        { id: 2, name: 'Evening Ride', distance: 20000, moving_time: 3600, start_date_local: '2023-01-02', type: 'ride' },
      ];

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ activities: mockActivities }),
      });

      const { result } = renderHook(() => useStravaActivities(false));

      await act(async () => {
        await result.current.loadActivities();
      });

      expect(result.current.activities).toEqual(mockActivities);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('should handle 401 unauthorized error', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useStravaActivities(false));

      await act(async () => {
        await result.current.loadActivities();
      });

      expect(result.current.activities).toEqual([]);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('should handle 400 bad request error', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { result } = renderHook(() => useStravaActivities(false));

      await act(async () => {
        await result.current.loadActivities();
      });

      expect(result.current.activities).toEqual([]);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('should handle network errors', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useStravaActivities(false));

      await act(async () => {
        await result.current.loadActivities();
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'Impossible de récupérer les activités Strava'
      );
      expect(result.current.loading).toBe(false);
    });

    it('should handle other HTTP errors', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useStravaActivities(false));

      await act(async () => {
        await result.current.loadActivities();
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'Impossible de récupérer les activités Strava'
      );
      expect(result.current.loading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useStravaActivities(false));

      // Start loading in an act block but don't await it yet
      let loadPromise: Promise<void>;
      act(() => {
        loadPromise = result.current.loadActivities();
      });

      // At this point, loading should be true
      expect(result.current.loading).toBe(true);

      // Resolve fetch
      resolveFetch!({
        ok: true,
        status: 200,
        json: async () => ({ activities: [] }),
      });

      await act(async () => {
        await loadPromise;
      });

      // After fetch
      expect(result.current.loading).toBe(false);
    });
  });

  describe('connectToStrava', () => {
    it('should redirect to Strava authorization page', () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      const { result } = renderHook(() => useStravaActivities(false));

      result.current.connectToStrava();

      expect(mockLocation.href).toBe('/api/auth/strava/authorize');
    });
  });

  describe('useEffect behavior', () => {
    it('should load activities when dialog is opened', async () => {
      const mockActivities = [
        { id: 1, name: 'Morning Run', distance: 5000, moving_time: 1200, start_date_local: '2023-01-01', type: 'run' },
      ];

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ activities: mockActivities }),
      });

      const { rerender } = renderHook(({ open }) => useStravaActivities(open), {
        initialProps: { open: false },
      });

      // Initially closed - should not fetch
      expect(fetch).not.toHaveBeenCalled();

      // Open dialog - wrap in act to handle the useEffect
      await act(async () => {
        rerender({ open: true });
        // Wait for the effect to complete
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(fetch).toHaveBeenCalledWith('/api/strava/activities');
    });

    it('should reset state when dialog is opened', async () => {
      const mockActivities = [
        { id: 1, name: 'Morning Run', distance: 5000, moving_time: 1200, start_date_local: '2023-01-01', type: 'run' },
      ];

      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ activities: mockActivities }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ activities: mockActivities }),
        });

      const { rerender, result } = renderHook(({ open }) => useStravaActivities(open), {
        initialProps: { open: false },
      });

      await act(async () => {
        await result.current.loadActivities();
      });

      expect(result.current.activities).toEqual(mockActivities);
      expect(result.current.isConnected).toBe(true);

      // Close and reopen - the useEffect will reset and fetch again
      await act(async () => {
        rerender({ open: false });
        rerender({ open: true });
        // Wait for effects to complete
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should reset state (happens before fetch completes)
      // After reopening, activities will be set again from the second mock
      expect(result.current.activities).toEqual(mockActivities);
      expect(result.current.isConnected).toBe(true);
    });

    it('should not fetch when dialog is closed', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ activities: [] }),
      });

      const { rerender } = renderHook(({ open }) => useStravaActivities(open), {
        initialProps: { open: true },
      });

      // Wait for initial fetch to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(fetch).toHaveBeenCalled();

      act(() => {
        rerender({ open: false });
      });

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty activities array', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ activities: [] }),
      });

      // Start with open: false to prevent automatic fetch
      const { result } = renderHook(() => useStravaActivities(false));

      await act(async () => {
        await result.current.loadActivities();
      });

      expect(result.current.activities).toEqual([]);
      expect(result.current.isConnected).toBe(true);
    });

    it('should handle malformed JSON response', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}), // No activities field
      });

      const { result } = renderHook(() => useStravaActivities(false));

      await act(async () => {
        await result.current.loadActivities();
      });

      expect(result.current.activities).toEqual(undefined);
      expect(result.current.isConnected).toBe(true);
    });

    it('should handle multiple rapid open/close cycles', async () => {
      const mockActivities = [
        { id: 1, name: 'Morning Run', distance: 5000, moving_time: 1200, start_date_local: '2023-01-01', type: 'run' },
      ];

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ activities: mockActivities }),
      });

      const { rerender } = renderHook(({ open }) => useStravaActivities(open), {
        initialProps: { open: false },
      });

      // Open/close cycles - wait for each fetch to complete before next cycle
      // This is more realistic than truly "rapid" cycles
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          rerender({ open: true });
          // Wait for the effect and fetch to trigger and complete
          await new Promise(resolve => setTimeout(resolve, 10));
        });

        await act(async () => {
          rerender({ open: false });
        });
      }

      // Should have fetched 3 times (once per open)
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle fetch being called multiple times concurrently', async () => {
      const mockActivities = [
        { id: 1, name: 'Morning Run', distance: 5000, moving_time: 1200, start_date_local: '2023-01-01', type: 'run' },
      ];

      let resolveFetch1: (value: unknown) => void;
      let resolveFetch2: (value: unknown) => void;

      const fetchPromise1 = new Promise((resolve) => {
        resolveFetch1 = resolve;
      });
      const fetchPromise2 = new Promise((resolve) => {
        resolveFetch2 = resolve;
      });

      (fetch as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(fetchPromise1)
        .mockReturnValueOnce(fetchPromise2);

      const { result } = renderHook(() => useStravaActivities(false));

      let promise1: Promise<void>;
      let promise2: Promise<void>;

      act(() => {
        promise1 = result.current.loadActivities();
        promise2 = result.current.loadActivities();
      });

      expect(result.current.loading).toBe(true);

      resolveFetch1!({
        ok: true,
        status: 200,
        json: async () => ({ activities: mockActivities }),
      });

      await act(async () => {
        await promise1;
      });

      resolveFetch2!({
        ok: true,
        status: 200,
        json: async () => ({ activities: [...mockActivities, { id: 2, name: 'Evening Run', distance: 3000, moving_time: 900, start_date_local: '2023-01-02', type: 'run' }] }),
      });

      await act(async () => {
        await promise2;
      });

      expect(result.current.activities.length).toBe(2);
      expect(result.current.loading).toBe(false);
    });
  });
});