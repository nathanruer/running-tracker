import { renderHook, act } from '@testing-library/react';
import { useSessionMutations } from '../use-session-mutations';
import { deleteSession, bulkDeleteSessions } from '@/lib/services/api-client';
import { vi } from 'vitest';
import type { TrainingSession } from '@/lib/types';

const mockQueryClient = {
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  cancelQueries: vi.fn().mockResolvedValue(undefined),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
};

const mockHandleError = vi.fn();
const mockHandleSuccess = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
  InfiniteData: vi.fn(),
}));

vi.mock('../use-api-error-handler', () => ({
  useApiErrorHandler: () => ({
    handleError: mockHandleError,
    handleSuccess: mockHandleSuccess,
  }),
}));

vi.mock('@/lib/services/api-client', () => ({
  deleteSession: vi.fn().mockResolvedValue(undefined),
  bulkDeleteSessions: vi.fn().mockResolvedValue(undefined),
}));

describe('useSessionMutations', () => {
  beforeEach(() => {
    mockQueryClient.getQueryData.mockClear();
    mockQueryClient.setQueryData.mockClear();
    mockQueryClient.cancelQueries.mockClear();
    mockQueryClient.invalidateQueries.mockClear();
    mockHandleError.mockClear();
    mockHandleSuccess.mockClear();

    (deleteSession as ReturnType<typeof vi.fn>).mockClear();
    (bulkDeleteSessions as ReturnType<typeof vi.fn>).mockClear();
    (deleteSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (bulkDeleteSessions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe('handleDelete', () => {
    it('should perform optimistic updates and call deleteSession', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];

      mockQueryClient.getQueryData
        .mockReturnValueOnce(mockSessions) // all data
        .mockReturnValueOnce({ pages: [[...mockSessions]] }); // paginated data

      const { result } = renderHook(() => useSessionMutations('all'));

      await act(async () => {
        await result.current.handleDelete('1');
      });

      expect(mockQueryClient.getQueryData).toHaveBeenCalledWith(['sessions', 'all', 'all']);
      expect(mockQueryClient.getQueryData).toHaveBeenCalledWith(['sessions', 'paginated', 'all']);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(2);

      expect(deleteSession).toHaveBeenCalledWith('1');

      expect(mockHandleSuccess).toHaveBeenCalledWith(
        'Séance supprimée',
        'La séance a été supprimée avec succès.'
      );

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessions'] });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessionTypes'] });
    });

    it('should rollback on error', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];

      mockQueryClient.getQueryData
        .mockReturnValueOnce(mockSessions)
        .mockReturnValueOnce({ pages: [[...mockSessions]] });

      (deleteSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useSessionMutations('all'));

      await act(async () => {
        await result.current.handleDelete('1');
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'Erreur lors de la suppression'
      );

      // Should have rolled back optimistic updates
      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(4); // 2 initial + 2 rollback
    });

    it('should handle filtered types by updating all cache', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1', type: 'interval' },
        { id: '2', name: 'Session 2', type: 'interval' },
      ];

      mockQueryClient.getQueryData
        .mockReturnValueOnce(mockSessions) // filtered data
        .mockReturnValueOnce({ pages: [[...mockSessions]] }); // filtered paginated

      const { result } = renderHook(() => useSessionMutations('interval'));

      await act(async () => {
        await result.current.handleDelete('1');
      });

      // Should have updated both filtered and all caches
      // When selectedType !== 'all', the hook updates:
      // 1. filtered 'all' cache
      // 2. filtered 'paginated' cache
      // 3. 'all' 'all' cache
      // 4. 'all' 'paginated' cache
      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(4);
    });
  });

  describe('handleBulkDelete', () => {
    it('should perform optimistic updates and call bulkDeleteSessions', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
        { id: '3', name: 'Session 3' },
      ];

      mockQueryClient.getQueryData
        .mockReturnValueOnce(mockSessions)
        .mockReturnValueOnce({ pages: [[...mockSessions]] });

      const { result } = renderHook(() => useSessionMutations('all'));

      await act(async () => {
        await result.current.handleBulkDelete(['1', '3']);
      });

      expect(bulkDeleteSessions).toHaveBeenCalledWith(['1', '3']);

      expect(mockHandleSuccess).toHaveBeenCalledWith(
        'Séances supprimées',
        '2 séances ont été supprimées avec succès.'
      );

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    });

    it('should rollback on error', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];

      mockQueryClient.getQueryData
        .mockReturnValueOnce(mockSessions)
        .mockReturnValueOnce({ pages: [[...mockSessions]] });

      (bulkDeleteSessions as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Bulk delete failed'));

      const { result } = renderHook(() => useSessionMutations('all'));

      await act(async () => {
        await result.current.handleBulkDelete(['1', '2']);
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'Erreur lors de la suppression groupée'
      );

      // Should have rolled back optimistic updates
      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(4); // 2 initial + 2 rollback
    });
  });

  describe('handleSessionSuccess', () => {
    it('should update cache for new session', () => {
      const existingSessions = [
        { id: '1', name: 'Session 1', date: '2023-01-10' },
        { id: '2', name: 'Session 2', date: '2023-01-05' },
      ];

      const newSession = { id: '3', name: 'New Session', date: '2023-01-15' } as unknown as TrainingSession;

      mockQueryClient.getQueryData
        .mockReturnValueOnce(existingSessions)
        .mockReturnValueOnce({ pages: [[...existingSessions]] });

      const { result } = renderHook(() => useSessionMutations('all'));

      act(() => {
        result.current.handleSessionSuccess(newSession);
      });

      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(2);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessions'] });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessionTypes'] });
    });

    it('should update cache for existing session', () => {
      const existingSessions = [
        { id: '1', name: 'Session 1', date: '2023-01-10' },
        { id: '2', name: 'Session 2', date: '2023-01-05' },
      ];

      const updatedSession = { id: '1', name: 'Updated Session', date: '2023-01-10' } as unknown as TrainingSession;

      mockQueryClient.getQueryData
        .mockReturnValueOnce(existingSessions)
        .mockReturnValueOnce({ pages: [[...existingSessions]] });

      const { result } = renderHook(() => useSessionMutations('all'));

      act(() => {
        result.current.handleSessionSuccess(updatedSession);
      });

      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(2);
    });

    it('should add new session to first page of paginated data', () => {
      const existingSessions = [
        { id: '1', name: 'Session 1', date: '2023-01-10' },
        { id: '2', name: 'Session 2', date: '2023-01-05' },
      ];

      const newSession = { id: '3', name: 'New Session', date: '2023-01-15' } as unknown as TrainingSession;

      mockQueryClient.getQueryData
        .mockReturnValueOnce(existingSessions)
        .mockReturnValueOnce({ pages: [[...existingSessions]] });

      const { result } = renderHook(() => useSessionMutations('all'));

      act(() => {
        result.current.handleSessionSuccess(newSession);
      });

      const paginatedCall = mockQueryClient.setQueryData.mock.calls.find(
        call => call[0][1] === 'paginated'
      );
      
      expect(paginatedCall).toBeDefined();
    });
  });

  describe('isDeleting state', () => {
    it('should set isDeleting to true during delete operation', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
      ];

      let resolveDelete: (value: unknown) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      (deleteSession as ReturnType<typeof vi.fn>).mockReturnValueOnce(deletePromise as Promise<void>);

      mockQueryClient.getQueryData
        .mockReturnValueOnce(mockSessions)
        .mockReturnValueOnce({ pages: [[...mockSessions]] });

      const { result } = renderHook(() => useSessionMutations('all'));

      expect(result.current.isDeleting).toBe(false);

      let handleDeletePromise: Promise<void>;
      act(() => {
        handleDeletePromise = result.current.handleDelete('1');
      });

      // Wait for microtask queue to flush (cancelQueries to resolve)
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isDeleting).toBe(true);

      resolveDelete!(undefined);

      await act(async () => {
        await handleDeletePromise;
      });

      expect(result.current.isDeleting).toBe(false);
    });

    it('should set isDeleting to true during bulk delete operation', async () => {
      const mockSessions = [
        { id: '1', name: 'Session 1' },
        { id: '2', name: 'Session 2' },
      ];

      let resolveDelete: (value: unknown) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      (bulkDeleteSessions as ReturnType<typeof vi.fn>).mockReturnValueOnce(deletePromise as Promise<void>);

      mockQueryClient.getQueryData
        .mockReturnValueOnce(mockSessions)
        .mockReturnValueOnce({ pages: [[...mockSessions]] });

      const { result } = renderHook(() => useSessionMutations('all'));

      expect(result.current.isDeleting).toBe(false);

      let handleDeletePromise: Promise<void>;
      act(() => {
        handleDeletePromise = result.current.handleBulkDelete(['1', '2']);
      });

      // Wait for microtask queue to flush (cancelQueries to resolve)
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isDeleting).toBe(true);

      resolveDelete!(undefined);

      await act(async () => {
        await handleDeletePromise;
      });

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty sessions array', async () => {
      mockQueryClient.getQueryData
        .mockReturnValueOnce([])
        .mockReturnValueOnce({ pages: [[]] });

      const { result } = renderHook(() => useSessionMutations('all'));

      await act(async () => {
        await result.current.handleDelete('1');
      });

      expect(deleteSession).toHaveBeenCalledWith('1');
    });

    it('should handle null query data', async () => {
      mockQueryClient.getQueryData
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);

      const { result } = renderHook(() => useSessionMutations('all'));

      await act(async () => {
        await result.current.handleDelete('1');
      });

      expect(deleteSession).toHaveBeenCalledWith('1');
    });

    it('should handle session not found in cache', () => {
      const existingSessions = [
        { id: '1', name: 'Session 1' },
      ];

      const newSession = { id: '2', name: 'New Session' } as unknown as TrainingSession;

      mockQueryClient.getQueryData
        .mockReturnValueOnce(existingSessions)
        .mockReturnValueOnce({ pages: [[...existingSessions]] });

      const { result } = renderHook(() => useSessionMutations('all'));

      act(() => {
        result.current.handleSessionSuccess(newSession);
      });

      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(2);
    });
  });
});