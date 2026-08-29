import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChatMutations } from '../use-chat-mutations';
import type { AIRecommendedSession } from '@/lib/types';
import { queryKeys } from '@/lib/constants/query-keys';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
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
  return { Wrapper, queryClient };
};

global.fetch = vi.fn();

describe('useChatMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockClear();
  });

  describe('acceptSession', () => {
    it('should accept a recommended session', async () => {
      const mockSession: AIRecommendedSession = {
        recommendation_id: 'rec-1',
        session_type: 'Endurance fondamentale',
        duration_min: 45,
        estimated_distance_km: 8,
        target_pace_min_km: '5:30',
        target_hr_bpm: 145,
        target_rpe: 6,
        description: 'Test session',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session-1' }),
      } as Response);

      const { result } = renderHook(() => useChatMutations('conv-1'), {
        wrapper: createWrapper().Wrapper,
      });

      result.current.acceptSession(mockSession);

      await waitFor(() => {
        expect(result.current.isAccepting).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/sessions/planned',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('rec-1'),
        })
      );
    });

    it('should set loading state during acceptance', async () => {
      const mockSession: AIRecommendedSession = {
        recommendation_id: 'rec-1',
        session_type: 'Endurance fondamentale',
        duration_min: 45,
        estimated_distance_km: 8,
        target_pace_min_km: '5:30',
      };

      let resolveResponse: (value: Response) => void;
      const responsePromise = new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });
      
      vi.mocked(fetch).mockImplementationOnce(() => responsePromise);

      const { result } = renderHook(() => useChatMutations('conv-1'), {
        wrapper: createWrapper().Wrapper,
      });

      result.current.acceptSession(mockSession);

      await waitFor(() => {
        expect(result.current.loadingSessionId).toBe('rec-1');
      });

      resolveResponse!({
        ok: true,
        json: async () => ({ id: 'session-1' }),
      } as Response);

      await waitFor(() => {
        expect(result.current.loadingSessionId).toBe(null);
      });
    });

    it('should show error when interval details are missing for fractionné', async () => {
      const mockSession: AIRecommendedSession = {
        recommendation_id: 'rec-2',
        session_type: 'Fractionné',
        duration_min: 30,
        estimated_distance_km: 5,
        interval_details: {
          workoutType: null,
          repetitionCount: null,
          effortDuration: null,
          recoveryDuration: null,
          effortDistance: null,
          recoveryDistance: null,
          targetEffortPace: null,
          targetEffortHR: null,
          targetRecoveryPace: null,
          steps: [],
        },
      };

      const { result } = renderHook(() => useChatMutations('conv-1'), {
        wrapper: createWrapper().Wrapper,
      });

      result.current.acceptSession(mockSession);

      await waitFor(() => {
        expect(result.current.isAccepting).toBe(false);
      });

      expect(toastMock).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('should delete a planned session', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useChatMutations('conv-1'), {
        wrapper: createWrapper().Wrapper,
      });

      result.current.deleteSession({ sessionId: 'session-1', recommendationId: 'rec-1' });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/sessions/session-1',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should rollback on delete error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Delete failed'));

      const { Wrapper, queryClient } = createWrapper();
      queryClient.setQueryData(queryKeys.sessionsHistory(), [
        { id: 'session-1', recommendationId: 'rec-1' },
      ]);

      const { result } = renderHook(() => useChatMutations('conv-1'), {
        wrapper: Wrapper,
      });

      result.current.deleteSession({ sessionId: 'session-1', recommendationId: 'rec-1' });

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalled();
      });

      const cached = queryClient.getQueryData(queryKeys.sessionsHistory()) as Array<{ id: string }>;
      expect(cached?.[0]?.id).toBe('session-1');
    });
  });

  describe('acceptSession optimistic update', () => {
    it('should create optimistic session with all properties including avgHeartRate', async () => {
      const mockSession: AIRecommendedSession = {
        recommendation_id: 'rec-1',
        session_type: 'Endurance fondamentale',
        duration_min: 45,
        estimated_distance_km: 8,
        target_pace_min_km: '5:30',
        target_hr_bpm: 145,
        target_rpe: 6,
        description: 'Test session',
      };

      let resolveResponse: (value: Response) => void;
      const responsePromise = new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });

      vi.mocked(fetch).mockImplementationOnce(() => responsePromise);

      const { Wrapper, queryClient } = createWrapper();
      queryClient.setQueryData(queryKeys.sessionsHistory(), []);

      const { result } = renderHook(() => useChatMutations('conv-1'), {
        wrapper: Wrapper,
      });

      result.current.acceptSession(mockSession);

      await waitFor(() => {
        expect(result.current.loadingSessionId).toBe('rec-1');
      });

      const cachedSessions = queryClient.getQueryData(queryKeys.sessionsHistory()) as Array<{ id: string; avgHeartRate: number | null; perceivedExertion: number | null }>;
      expect(cachedSessions).toHaveLength(1);
      expect(cachedSessions[0].id).toContain('optimistic-');
      expect(cachedSessions[0].avgHeartRate).toBeNull();
      expect(cachedSessions[0].perceivedExertion).toBeNull();

      resolveResponse!({
        ok: true,
        json: async () => ({ id: 'session-1' }),
      } as Response);

      await waitFor(() => {
        expect(result.current.loadingSessionId).toBe(null);
      });
    });
  });
});
