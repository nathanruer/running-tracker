import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  prefetchProfileData,
  prefetchDashboardData,
  prefetchChatData,
  prefetchDataForRoute,
} from '../prefetch';
import { queryKeys } from '@/lib/constants/query-keys';

vi.mock('../api-client', () => ({
  getCurrentUser: vi.fn(),
  getSessions: vi.fn(),
  getConversations: vi.fn(),
}));

describe('prefetch utilities', () => {
  let queryClient: QueryClient;
  const user = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.spyOn(queryClient, 'prefetchQuery').mockResolvedValue(undefined);
    vi.spyOn(queryClient, 'prefetchInfiniteQuery').mockResolvedValue(undefined);
    vi.spyOn(queryClient, 'fetchQuery').mockResolvedValue(user);
  });

  describe('prefetchProfileData', () => {
    it('should prefetch user data', async () => {
      await prefetchProfileData(queryClient);

      expect(queryClient.fetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: queryKeys.user(),
          staleTime: 10 * 60 * 1000,
        })
      );
    });

    it('should prefetch sessions data with user key', async () => {
      await prefetchProfileData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: queryKeys.sessionsAll(user.id),
          staleTime: 5 * 60 * 1000,
        })
      );
    });

    it('should call prefetchQuery once', async () => {
      await prefetchProfileData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('prefetchDashboardData', () => {
    it('should prefetch sessions data with paginated key', async () => {
      await prefetchDashboardData(queryClient);

      expect(queryClient.prefetchInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: queryKeys.sessionsPaginated({
            selectedType: 'all',
            sortKey: 'default',
            search: '',
            dateFrom: undefined,
            userId: user.id,
          }),
          staleTime: 5 * 60 * 1000,
        })
      );
    });

    it('should call prefetchInfiniteQuery once', async () => {
      await prefetchDashboardData(queryClient);

      expect(queryClient.prefetchInfiniteQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('prefetchChatData', () => {
    it('should prefetch conversations data', async () => {
      await prefetchChatData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: queryKeys.conversations(),
          staleTime: 1 * 60 * 1000,
        })
      );
    });

    it('should call prefetchQuery once', async () => {
      await prefetchChatData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('prefetchDataForRoute', () => {
    it('should call prefetchProfileData for /profile route', async () => {
      await prefetchDataForRoute(queryClient, '/profile');

      expect(queryClient.fetchQuery).toHaveBeenCalled();
      expect(queryClient.prefetchQuery).toHaveBeenCalled();
    });

    it('should call prefetchDashboardData for /dashboard route', async () => {
      await prefetchDataForRoute(queryClient, '/dashboard');

      expect(queryClient.prefetchInfiniteQuery).toHaveBeenCalled();
    });

    it('should call prefetchChatData for /chat route', async () => {
      await prefetchDataForRoute(queryClient, '/chat');

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: queryKeys.conversations(),
        })
      );
    });

    it('should not call any prefetch for unknown route', () => {
      prefetchDataForRoute(queryClient, '/unknown');

      expect(queryClient.prefetchQuery).not.toHaveBeenCalled();
      expect(queryClient.prefetchInfiniteQuery).not.toHaveBeenCalled();
    });

    it('should not call any prefetch for empty route', () => {
      prefetchDataForRoute(queryClient, '');

      expect(queryClient.prefetchQuery).not.toHaveBeenCalled();
      expect(queryClient.prefetchInfiniteQuery).not.toHaveBeenCalled();
    });
  });
});
