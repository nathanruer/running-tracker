import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConversationCreation } from '../use-conversation-creation';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: mockPush,
  }),
}));

global.fetch = vi.fn();

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

describe('useConversationCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(
      () => useConversationCreation({ conversationId: null }),
      { wrapper: createWrapper() }
    );

    expect(result.current.optimisticMessages).toEqual([]);
    expect(result.current.isWaitingForResponse).toBe(false);
    expect(result.current.createConversationWithMessage).toBeInstanceOf(Function);
  });

  it('should create conversation and navigate successfully', async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === '/api/conversations') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'new-conv-123', title: 'Test Message' }),
        } as Response);
      }
      if (String(url).includes('/messages')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            userMessage: {
              id: 'msg-1',
              role: 'user',
              content: 'Test Message',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
            assistantMessage: {
              id: 'msg-2',
              role: 'assistant',
              content: 'Response',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
          }),
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(
      () => useConversationCreation({ conversationId: null }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.createConversationWithMessage('Test Message');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/chat/new-conv-123');
    });

    expect(fetch).toHaveBeenCalledWith('/api/conversations', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Message' }),
    }));

    expect(fetch).toHaveBeenCalledWith('/api/conversations/new-conv-123/messages', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Test Message' }),
    }));
  });

  it('should show optimistic message while waiting for response', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      new Promise(() => {})
    );

    const { result } = renderHook(
      () => useConversationCreation({ conversationId: null }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.createConversationWithMessage('Test Message');
    });

    await waitFor(() => {
      expect(result.current.optimisticMessages).toHaveLength(1);
      expect(result.current.optimisticMessages[0].content).toBe('Test Message');
      expect(result.current.optimisticMessages[0].role).toBe('user');
      expect(result.current.isWaitingForResponse).toBe(true);
    });
  });

  it('should truncate long titles to 50 characters', async () => {
    const longMessage = 'A'.repeat(60);
    const expectedTitle = 'A'.repeat(50) + '...';

    vi.mocked(fetch).mockImplementation((url) => {
      if (url === '/api/conversations') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'new-conv-123', title: expectedTitle }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          userMessage: { id: 'msg-1', role: 'user', content: longMessage, recommendations: null, createdAt: new Date().toISOString() },
          assistantMessage: { id: 'msg-2', role: 'assistant', content: 'Response', recommendations: null, createdAt: new Date().toISOString() },
        }),
      } as Response);
    });

    const { result } = renderHook(
      () => useConversationCreation({ conversationId: null }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.createConversationWithMessage(longMessage);
    });

    expect(fetch).toHaveBeenCalledWith('/api/conversations', expect.objectContaining({
      body: JSON.stringify({ title: expectedTitle }),
    }));
  });

  it('should handle conversation creation error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useConversationCreation({ conversationId: null }),
      { wrapper: createWrapper() }
    );

    let error: Error | undefined;

    await act(async () => {
      try {
        await result.current.createConversationWithMessage('Test Message');
      } catch (e) {
        error = e as Error;
      }
    });

    expect(error).toBeDefined();
    expect(error?.message).toBe('Network error');
    expect(result.current.optimisticMessages).toEqual([]);
    expect(result.current.isWaitingForResponse).toBe(false);
  });

  it('should clear optimistic messages when conversationId changes', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

    const { result, rerender } = renderHook(
      ({ conversationId }) => useConversationCreation({ conversationId }),
      {
        wrapper: createWrapper(),
        initialProps: { conversationId: null as string | null }
      }
    );

    act(() => {
      result.current.createConversationWithMessage('Test').catch(() => {
      });
    });

    await waitFor(() => {
      expect(result.current.optimisticMessages.length).toBeGreaterThan(0);
    });

    rerender({ conversationId: 'conv-123' });

    await waitFor(() => {
      expect(result.current.optimisticMessages).toEqual([]);
      expect(result.current.isWaitingForResponse).toBe(false);
    });
  });

  it('should handle message sending error', async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === '/api/conversations') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'new-conv-123', title: 'Test' }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    });

    const { result } = renderHook(
      () => useConversationCreation({ conversationId: null }),
      { wrapper: createWrapper() }
    );

    let error: Error | undefined;

    await act(async () => {
      try {
        await result.current.createConversationWithMessage('Test Message');
      } catch (e) {
        error = e as Error;
      }
    });

    expect(error).toBeDefined();
    expect(error?.message).toBe('Une erreur est survenue');
    expect(result.current.optimisticMessages).toEqual([]);
    expect(result.current.isWaitingForResponse).toBe(false);
  });
});
