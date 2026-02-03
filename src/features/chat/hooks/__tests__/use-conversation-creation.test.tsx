import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConversationCreation } from '../use-conversation-creation';
import { queryKeys } from '@/lib/constants/query-keys';

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

  it('should initialize with default state', () => {
    const { result } = renderHook(
      () => useConversationCreation({}),
      { wrapper: createWrapper() }
    );

    expect(result.current.isCreating).toBe(false);
    expect(result.current.createAndRedirect).toBeInstanceOf(Function);
  });

  it('should create conversation and call onConversationCreated', async () => {
    const onConversationCreated = vi.fn();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ conversationId: 'new-conv-123', messageId: 'msg-1' }),
    } as Response);

    const { result } = renderHook(
      () => useConversationCreation({ onConversationCreated }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.createAndRedirect('Test message');
    });

    await waitFor(() => {
      expect(onConversationCreated).toHaveBeenCalledWith('new-conv-123');
    });

    expect(fetch).toHaveBeenCalledWith('/api/conversations/with-message', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Test message' }),
    }));
  });

  it('should set isCreating to true during creation', async () => {
    let resolvePromise: (value: Response) => void;
    const promise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(fetch).mockReturnValue(promise);

    const { result } = renderHook(
      () => useConversationCreation({}),
      { wrapper: createWrapper() }
    );

    expect(result.current.isCreating).toBe(false);

    act(() => {
      result.current.createAndRedirect('Test');
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(true);
    });

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => ({ conversationId: 'new-conv', messageId: 'msg' }),
      } as Response);
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
  });

  it('should not allow multiple simultaneous creations when isCreating is true', async () => {
    let callCount = 0;

    vi.mocked(fetch).mockImplementation(async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        ok: true,
        json: async () => ({ conversationId: 'conv-' + callCount, messageId: 'msg' }),
      } as Response;
    });

    const { result } = renderHook(
      () => useConversationCreation({}),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.createAndRedirect('First');
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(true);
    });

    await act(async () => {
      result.current.createAndRedirect('Second');
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });

    expect(callCount).toBe(1);
  });

  it('should update conversations cache after creation', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ conversationId: 'new-conv-456', messageId: 'msg-1' }),
    } as Response);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    queryClient.setQueryData(queryKeys.conversations(), [
      { id: 'existing', title: 'Existing', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ]);

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';

    const { result } = renderHook(
      () => useConversationCreation({}),
      { wrapper: Wrapper }
    );

    await act(async () => {
      await result.current.createAndRedirect('New conversation message');
    });

    const conversations = queryClient.getQueryData(queryKeys.conversations()) as Array<{ id: string }>;
    expect(conversations).toHaveLength(2);
    expect(conversations[0].id).toBe('new-conv-456');
  });

  it('should reset isCreating on error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useConversationCreation({}),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.createAndRedirect('Test');
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.isCreating).toBe(false);
  });
});
