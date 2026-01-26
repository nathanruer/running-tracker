import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  prefetchProfileData,
  prefetchDashboardData,
  prefetchChatData,
  prefetchDataForRoute,
} from '../prefetch';

vi.mock('../api-client', () => ({
  getCurrentUser: vi.fn(),
  getSessions: vi.fn(),
  getConversations: vi.fn(),
}));

describe('prefetch utilities', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.spyOn(queryClient, 'prefetchQuery').mockResolvedValue(undefined);
  });

  describe('prefetchProfileData', () => {
    it('should prefetch user data', () => {
      prefetchProfileData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['user'],
          staleTime: 10 * 60 * 1000,
        })
      );
    });

    it('should prefetch sessions data with "all" key', () => {
      prefetchProfileData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['sessions', 'all'],
          staleTime: 5 * 60 * 1000,
        })
      );
    });

    it('should call prefetchQuery twice', () => {
      prefetchProfileData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('prefetchDashboardData', () => {
    it('should prefetch sessions data', () => {
      prefetchDashboardData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['sessions'],
          staleTime: 5 * 60 * 1000,
        })
      );
    });

    it('should call prefetchQuery once', () => {
      prefetchDashboardData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('prefetchChatData', () => {
    it('should prefetch conversations data', () => {
      prefetchChatData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['conversations'],
          staleTime: 1 * 60 * 1000,
        })
      );
    });

    it('should call prefetchQuery once', () => {
      prefetchChatData(queryClient);

      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('prefetchDataForRoute', () => {
    it('should call prefetchProfileData for /profile route', () => {
      prefetchDataForRoute(queryClient, '/profile');

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['user'],
        })
      );
    });

    it('should call prefetchDashboardData for /dashboard route', () => {
      prefetchDataForRoute(queryClient, '/dashboard');

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['sessions'],
        })
      );
    });

    it('should call prefetchChatData for /chat route', () => {
      prefetchDataForRoute(queryClient, '/chat');

      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['conversations'],
        })
      );
    });

    it('should not call any prefetch for unknown route', () => {
      prefetchDataForRoute(queryClient, '/unknown');

      expect(queryClient.prefetchQuery).not.toHaveBeenCalled();
    });

    it('should not call any prefetch for empty route', () => {
      prefetchDataForRoute(queryClient, '');

      expect(queryClient.prefetchQuery).not.toHaveBeenCalled();
    });
  });
});
