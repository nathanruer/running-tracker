import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useInfiniteQuery: vi.fn(),
}));

vi.mock('@/hooks/use-entity-mutations', () => ({
  useEntityMutations: vi.fn(),
}));

vi.mock('@/lib/services/api-client', () => ({
  getCurrentUser: vi.fn(),
  getSessions: vi.fn(),
  getSessionsCount: vi.fn(),
  getSessionTypes: vi.fn(),
  deleteSession: vi.fn(),
  bulkDeleteSessions: vi.fn(),
}));

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useEntityMutations } from '@/hooks/use-entity-mutations';
import { useDashboardData } from '../use-dashboard-data';
import type { TrainingSession } from '@/lib/types';

const createSession = (id: string, overrides?: Partial<TrainingSession>): TrainingSession => ({
  id,
  sessionNumber: 1,
  week: 1,
  date: '2024-01-01',
  sessionType: 'Footing',
  duration: '00:30:00',
  distance: 5,
  avgPace: '06:00',
  avgHeartRate: 140,
  perceivedExertion: 5,
  comments: 'Test',
  userId: 'user1',
  status: 'completed',
  ...overrides,
});

const mockUser = { id: 'user1', email: 'test@test.com' };

const mockMutations = {
  handleDelete: vi.fn(),
  handleBulkDelete: vi.fn(),
  handleEntitySuccess: vi.fn(),
  isDeleting: false,
};

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEntityMutations).mockReturnValue(mockMutations);
  });

  describe('initialization', () => {
    it('should return initial loading state when user is loading', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: undefined, isLoading: true } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: true,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.userLoading).toBe(true);
      expect(result.current.initialLoading).toBe(true);
    });

    it('should return user data when loaded', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: ['Footing', 'Interval'] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 5 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: { pages: [[createSession('1')]], pageParams: [0] },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.userLoading).toBe(false);
    });
  });

  describe('sessions data', () => {
    it('should return empty sessions array when no data', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.sessions).toEqual([]);
    });

    it('should flatten paginated sessions from multiple pages', () => {
      const page1 = [createSession('1'), createSession('2')];
      const page2 = [createSession('3'), createSession('4')];

      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: ['Footing'] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 4 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: { pages: [page1, page2], pageParams: [0, 10] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.sessions).toHaveLength(4);
      expect(result.current.sessions.map(s => s.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should deduplicate sessions by id', () => {
      const page1 = [createSession('1'), createSession('2')];
      const page2 = [createSession('2'), createSession('3')];

      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: ['Footing'] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 3 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: { pages: [page1, page2], pageParams: [0, 10] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.sessions).toHaveLength(3);
      expect(result.current.sessions.map(s => s.id)).toEqual(['1', '2', '3']);
    });
  });

  describe('available types', () => {
    it('should return empty array as default for availableTypes', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: undefined } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.availableTypes).toEqual([]);
    });

    it('should return sorted session types', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: ['Interval', 'Footing', 'Tempo'] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.availableTypes).toEqual(['Interval', 'Footing', 'Tempo']);
    });
  });

  describe('totalCount', () => {
    it('should return 0 as default for totalCount', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: undefined } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.totalCount).toBe(0);
    });

    it('should return totalCount from query', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 42 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.totalCount).toBe(42);
    });
  });

  describe('pagination', () => {
    it('should return hasMore based on hasNextPage', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 20 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: { pages: [[createSession('1')]], pageParams: [0] },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.hasMore).toBe(true);
    });

    it('should return fetchNextPage function', () => {
      const mockFetchNextPage = vi.fn();

      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 10 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: { pages: [[createSession('1')]], pageParams: [0] },
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.fetchNextPage).toBe(mockFetchNextPage);
    });

    it('should return isFetchingNextPage state', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 10 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: { pages: [[createSession('1')]], pageParams: [0] },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: true,
        isLoading: false,
        isFetching: true,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.isFetchingNextPage).toBe(true);
    });
  });

  describe('loading states', () => {
    it('should return initialLoading true when user is loading', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: undefined, isLoading: true } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.initialLoading).toBe(true);
    });

    it('should return initialLoading true when sessions are loading and empty', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.initialLoading).toBe(true);
    });

    it('should return initialLoading false when sessions exist even if fetching', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 1 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: { pages: [[createSession('1')]], pageParams: [0] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.initialLoading).toBe(false);
    });

    it('should return isFetchingData state', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 1 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: { pages: [[createSession('1')]], pageParams: [0] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: true,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.isFetchingData).toBe(true);
    });
  });

  describe('mutations', () => {
    it('should return mutations from useEntityMutations', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      const { result } = renderHook(() => useDashboardData('all'));

      expect(result.current.mutations).toBe(mockMutations);
    });

    it('should call useEntityMutations with correct parameters', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      renderHook(() => useDashboardData('Footing'));

      expect(useEntityMutations).toHaveBeenCalledWith(
        expect.objectContaining({
          baseQueryKey: 'sessions',
          filterType: 'Footing',
          relatedQueryKeys: ['sessionTypes', 'sessionsCount'],
        })
      );
    });
  });

  describe('query parameters', () => {
    it('should pass sortParam to useInfiniteQuery', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      renderHook(() => useDashboardData('all', 'date:desc'));

      expect(useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['sessions', 'paginated', 'all', 'date:desc']),
        })
      );
    });

    it('should use default sortKey when sortParam is null', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      renderHook(() => useDashboardData('all', null));

      expect(useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['sessions', 'paginated', 'all', 'default']),
        })
      );
    });

    it('should pass searchQuery to queries', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      renderHook(() => useDashboardData('all', null, 'marathon'));

      expect(useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['marathon']),
        })
      );
    });

    it('should trim searchQuery whitespace', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      renderHook(() => useDashboardData('all', null, '  test  '));

      expect(useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['test']),
        })
      );
    });

    it('should pass dateFrom to queries', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      renderHook(() => useDashboardData('all', null, '', '2024-01-01'));

      expect(useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['2024-01-01']),
        })
      );
    });
  });

  describe('staleTime configuration', () => {
    it('should use 0 staleTime for sessions query', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      renderHook(() => useDashboardData('all'));

      expect(useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 0,
        })
      );
    });

    it('should use 0 staleTime for sessionsCount query', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ data: mockUser, isLoading: false } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: [] } as ReturnType<typeof useQuery>)
        .mockReturnValueOnce({ data: 0 } as ReturnType<typeof useQuery>);

      vi.mocked(useInfiniteQuery).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useInfiniteQuery>);

      renderHook(() => useDashboardData('all'));

      // The third useQuery call is for sessionsCount
      const sessionsCountCall = vi.mocked(useQuery).mock.calls[2];
      expect(sessionsCountCall[0]).toMatchObject({
        staleTime: 0,
      });
    });
  });
});
