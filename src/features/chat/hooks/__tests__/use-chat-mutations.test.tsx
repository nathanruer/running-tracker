import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChatMutations } from '../use-chat-mutations';
import type { AIRecommendedSession } from '@/lib/types';

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

global.fetch = vi.fn();

describe('useChatMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
  });

  describe('deleteSession', () => {
    it('should delete a planned session', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useChatMutations('conv-1'), {
        wrapper: createWrapper(),
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
  });

  describe('sendMessage', () => {
    it('should send a message', async () => {
      const mockResponse = {
        userMessage: { id: 'msg-1', role: 'user', content: 'Hello' },
        assistantMessage: { id: 'msg-2', role: 'assistant', content: 'Hi' },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useChatMutations('conv-1'), {
        wrapper: createWrapper(),
      });

      result.current.sendMessage('Hello');

      await waitFor(() => {
        expect(result.current.isSending).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/messages',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Hello' }),
        })
      );
    });

    it('should throw error when no conversation is selected', async () => {
      const { result } = renderHook(() => useChatMutations(null), {
        wrapper: createWrapper(),
      });

      result.current.sendMessage('Hello');

      await waitFor(() => {
        expect(result.current.isSending).toBe(false);
      });
    });
  });
});
