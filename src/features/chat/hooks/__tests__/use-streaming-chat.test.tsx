import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStreamingChat } from '../use-streaming-chat';
import { queryKeys } from '@/lib/constants/query-keys';

const toastMock = vi.hoisted(() => vi.fn());

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

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

describe('useStreamingChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    toastMock.mockClear();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    expect(result.current.streamingContent).toBe('');
    expect(result.current.isStreaming).toBe(false);
    expect(typeof result.current.sendStreamingMessage).toBe('function');
    expect(typeof result.current.cancelStream).toBe('function');
  });

  it('should set isStreaming to true when sending message', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"chunk","data":"Hello"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"done","data":""}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    expect(result.current.isStreaming).toBe(false);

    act(() => {
      result.current.sendStreamingMessage('conv-1', 'Test message');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });
  });

  it('should accumulate streaming content', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"chunk","data":"Hello "}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"chunk","data":"World"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"done","data":""}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Test');
    });

    expect(result.current.streamingContent).toBe('');
  });

  it('should call fetch with correct parameters', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"done","data":""}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-123', 'Hello world');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/conversations/conv-123/messages/stream',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Hello world', skipSaveUserMessage: false }),
      })
    );
  });

  it('should not send message without conversationId', async () => {
    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('', 'Test');
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should include recommendations when json event is received', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"json","data":"{\\"recommended_sessions\\":[]}"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"done","data":""}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.conversation('conv-1'), {
      id: 'conv-1',
      chat_messages: [],
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Hello');
    });

    const conversation = queryClient.getQueryData(queryKeys.conversation('conv-1')) as { chat_messages: Array<{ recommendations?: unknown }> };
    expect(conversation.chat_messages.at(-1)?.recommendations).toEqual({ recommended_sessions: [] });
  });

  it('should skip optimistic user message when option is set', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"done","data":""}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.conversation('conv-1'), {
      id: 'conv-1',
      chat_messages: [],
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Hello', { skipOptimisticUserMessage: true });
    });

    const conversation = queryClient.getQueryData(queryKeys.conversation('conv-1')) as { chat_messages: Array<{ role: string }> };
    expect(conversation.chat_messages).toHaveLength(1);
    expect(conversation.chat_messages[0].role).toBe('assistant');
  });

  it('should toast on stream error events', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"error","data":"Erreur"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Hello');
    });

    expect(toastMock).toHaveBeenCalled();
  });

  it('should toast when response is not ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      body: null,
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Hello');
    });

    expect(toastMock).toHaveBeenCalled();
  });

  it('should use skipSaveUserMessage option', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"done","data":""}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Hello', { skipSaveUserMessage: true });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/conversations/conv-1/messages/stream',
      expect.objectContaining({
        body: JSON.stringify({ content: 'Hello', skipSaveUserMessage: true }),
      })
    );
  });

  it('should silently return when AbortError occurs', async () => {
    const originalAbortController = global.AbortController;

    class MockAbortController {
      abort = vi.fn();
      signal = { aborted: false } as AbortSignal;
    }

    global.AbortController = MockAbortController as unknown as typeof AbortController;

    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(abortError);

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Hello');
    });

    expect(toastMock).not.toHaveBeenCalled();
    expect(result.current.isStreaming).toBe(false);

    global.AbortController = originalAbortController;
  });

  it('should remove temp messages on error (non-abort)', async () => {
    const originalAbortController = global.AbortController;

    class MockAbortController {
      abort = vi.fn();
      signal = { aborted: false } as AbortSignal;
    }

    global.AbortController = MockAbortController as unknown as typeof AbortController;

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.conversation('conv-1'), {
      id: 'conv-1',
      chat_messages: [
        { id: 'temp-user-123', role: 'user', content: 'Test', recommendations: null, createdAt: new Date().toISOString() },
      ],
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Hello');
    });

    expect(toastMock).toHaveBeenCalled();
    const conversation = queryClient.getQueryData(queryKeys.conversation('conv-1')) as { chat_messages: Array<{ id: string }> };
    expect(conversation.chat_messages.filter(m => m.id.startsWith('temp-'))).toHaveLength(0);

    global.AbortController = originalAbortController;
  });

  it('should abort stream on cleanup (unmount)', async () => {
    const abortMock = vi.fn();
    const originalAbortController = global.AbortController;

    class MockAbortController {
      abort = abortMock;
      signal = { aborted: false };
    }
    global.AbortController = MockAbortController as unknown as typeof AbortController;

    let resolveRead: (value: { done: boolean; value: Uint8Array | undefined }) => void;
    const readPromise = new Promise<{ done: boolean; value: Uint8Array | undefined }>((resolve) => {
      resolveRead = resolve;
    });

    const mockReader = {
      read: vi.fn().mockReturnValue(readPromise),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { result, unmount } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    act(() => {
      result.current.sendStreamingMessage('conv-1', 'Hello');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    unmount();

    expect(abortMock).toHaveBeenCalled();

    resolveRead!({ done: true, value: undefined });

    global.AbortController = originalAbortController;
  });

  it('should handle cancelStream function', async () => {
    const abortMock = vi.fn();
    const originalAbortController = global.AbortController;

    class MockAbortController {
      abort = abortMock;
      signal = { aborted: false };
    }
    global.AbortController = MockAbortController as unknown as typeof AbortController;

    let resolveRead: (value: { done: boolean; value: Uint8Array | undefined }) => void;
    const readPromise = new Promise<{ done: boolean; value: Uint8Array | undefined }>((resolve) => {
      resolveRead = resolve;
    });

    const mockReader = {
      read: vi.fn().mockReturnValue(readPromise),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: createWrapper().Wrapper,
    });

    act(() => {
      result.current.sendStreamingMessage('conv-1', 'Hello');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    act(() => {
      result.current.cancelStream();
    });

    expect(abortMock).toHaveBeenCalled();
    expect(result.current.isStreaming).toBe(false);

    resolveRead!({ done: true, value: undefined });

    global.AbortController = originalAbortController;
  });

  it('should handle setQueryData returning undefined in error handler', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.conversation('conv-1'), undefined);

    const { result } = renderHook(() => useStreamingChat(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.sendStreamingMessage('conv-1', 'Hello');
    });

    expect(toastMock).toHaveBeenCalled();
    const conversation = queryClient.getQueryData(queryKeys.conversation('conv-1'));
    expect(conversation).toBeUndefined();
  });
});
