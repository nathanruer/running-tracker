import { renderHook, act } from '@testing-library/react';
import { useSessionsData } from '../use-sessions-data';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useInfiniteQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@/lib/services/api-client', () => ({
  getSessions: vi.fn(),
}));

describe('useSessionsData', () => {
  const mockQueryClient = {
    getQueryData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue(mockQueryClient);
  });

  describe('All view mode', () => {
    it('should load all sessions when viewMode is "all"', () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];

      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockSessions,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, false)
      );

      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.initialLoading).toBe(false);
      expect(result.current.hasMore).toBe(false);
    });

    it('should show initial loading when no data and loading', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: false,
      });

      (useInfiniteQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, false)
      );

      expect(result.current.initialLoading).toBe(true);
    });

    it('should use paginated data as placeholder when available', () => {
      const mockPaginatedSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];

      // Mock query to return placeholder data while loading
      // This simulates the placeholderData function returning flattened paginated data
      (useQuery as jest.Mock).mockReturnValue({
        data: mockPaginatedSessions, // Placeholder data is returned as data
        isLoading: true,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [mockPaginatedSessions] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      mockQueryClient.getQueryData.mockReturnValue({
        pages: [mockPaginatedSessions]
      });

      const { result } = renderHook(() =>
        useSessionsData('all', 'all', false, false)
      );

      expect(result.current.sessions).toEqual(mockPaginatedSessions);
    });

    it('should not use paginated data as placeholder when last page is full', () => {
      const mockPaginatedSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
        { id: '3', name: 'Session 3' },
        { id: '4', name: 'Session 4' },
        { id: '5', name: 'Session 5' },
        { id: '6', name: 'Session 6' },
        { id: '7', name: 'Session 7' },
        { id: '8', name: 'Session 8' },
        { id: '9', name: 'Session 9' },
        { id: '10', name: 'Session 10' },
      ];

      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [mockPaginatedSessions] },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      mockQueryClient.getQueryData.mockReturnValue({ 
        pages: [mockPaginatedSessions] 
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, false)
      );

      expect(result.current.sessions).toEqual([]);
    });
  });

  describe('Paginated view mode', () => {
    it('should load paginated sessions when viewMode is "paginated"', () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];

      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [mockSessions] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('paginated', 'all', false, false)
      );

      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.initialLoading).toBe(false);
      expect(result.current.hasMore).toBe(false);
    });

    it('should show initial loading when no data and loading', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: true,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('paginated', 'all', false, false)
      );

      expect(result.current.initialLoading).toBe(true);
    });

    it('should show hasMore when there are more pages', () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];

      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [mockSessions] },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('paginated', 'all', false, false)
      );

      expect(result.current.hasMore).toBe(true);
    });

    it('should call fetchNextPage when loadMore is called', () => {
      const mockFetchNextPage = vi.fn();

      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [[]] },
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('paginated', 'all', false, false)
      );

      act(() => {
        result.current.loadMore();
      });

      expect(mockFetchNextPage).toHaveBeenCalled();
    });

    it('should not call fetchNextPage when viewMode is not paginated', () => {
      const mockFetchNextPage = vi.fn();

      (useQuery as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, false)
      );

      act(() => {
        result.current.loadMore();
      });

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });
  });

  describe('User loading state', () => {
    it('should show initial loading when user is loading', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [[]] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', true, false)
      );

      expect(result.current.initialLoading).toBe(true);
    });

    it('should show initial loading when isDeleting is true', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [[]] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, true)
      );

      expect(result.current.initialLoading).toBe(true);
    });
  });

  describe('showGlobalLoading', () => {
    it('should show global loading when user is loading', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', true, false)
      );

      expect(result.current.showGlobalLoading).toBe(true);
    });

    it('should show global loading when no data and queries are loading', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, false)
      );

      expect(result.current.showGlobalLoading).toBe(true);
    });

    it('should not show global loading when data is available', () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
      ];

      (useQuery as jest.Mock).mockReturnValue({
        data: mockSessions,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, false)
      );

      expect(result.current.showGlobalLoading).toBe(false);
    });
  });

  describe('isFetching state', () => {
    it('should show isFetching when all sessions are fetching', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: true,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, false)
      );

      expect(result.current.isFetching).toBe(true);
    });

    it('should show isFetching when paginated sessions are fetching', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [[]] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: true,
      });

      const { result } = renderHook(() => 
        useSessionsData('paginated', 'all', false, false)
      );

      expect(result.current.isFetching).toBe(true);
    });
  });

  describe('isFetchingNextPage state', () => {
    it('should show isFetchingNextPage when loading next page', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [[]] },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: true,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('paginated', 'all', false, false)
      );

      expect(result.current.isFetchingNextPage).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty sessions array', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('all', 'all', false, false)
      );

      expect(result.current.sessions).toEqual([]);
      expect(result.current.initialLoading).toBe(false);
    });

    it('should handle undefined paginated data', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('paginated', 'all', false, false)
      );

      expect(result.current.sessions).toEqual([]);
    });

    it('should handle multiple pages in paginated data', () => {
      const page1 = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];
      const page2 = [
        { id: '3', name: 'Session 3' },
        { id: '4', name: 'Session 4' },
      ];

      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      });

      (useInfiniteQuery as jest.Mock).mockReturnValue({
        data: { pages: [page1, page2] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => 
        useSessionsData('paginated', 'all', false, false)
      );

      expect(result.current.sessions).toEqual([...page1, ...page2]);
    });
  });
});