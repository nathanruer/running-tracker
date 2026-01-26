import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConversations } from '../use-conversations';
import * as apiClient from '@/lib/services/api-client';

vi.mock('@/lib/services/api-client', () => ({
  getConversations: vi.fn(),
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

const mockConversations = [
  {
    id: 'conv-1',
    title: 'Test Conversation 1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    _count: { chat_messages: 5 },
  },
  {
    id: 'conv-2',
    title: 'Test Conversation 2',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    _count: { chat_messages: 10 },
  },
];

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty conversations array while loading', () => {
    vi.mocked(apiClient.getConversations).mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.showSkeleton).toBe(true);
  });

  it('should return conversations after successful fetch', async () => {
    vi.mocked(apiClient.getConversations).mockResolvedValueOnce(mockConversations);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toEqual(mockConversations);
    expect(result.current.showSkeleton).toBe(false);
    expect(apiClient.getConversations).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no conversations exist', async () => {
    vi.mocked(apiClient.getConversations).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.showSkeleton).toBe(false);
  });

  it('should show skeleton only when loading with no cached data', async () => {
    vi.mocked(apiClient.getConversations).mockResolvedValueOnce(mockConversations);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    expect(result.current.showSkeleton).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.showSkeleton).toBe(false);
  });

  it('should handle fetch error', async () => {
    vi.mocked(apiClient.getConversations).mockRejectedValueOnce(
      new Error('Failed to fetch')
    );

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.isError).toBe(true);
  });
});
