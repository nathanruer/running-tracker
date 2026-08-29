import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useEntityMutations } from '../use-entity-mutations';

const mockHandleError = vi.fn();
const mockHandleSuccess = vi.fn();

vi.mock('@/hooks/use-error-handler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
    handleSuccess: mockHandleSuccess,
  }),
}));

vi.mock('@/lib/services/api-client', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/services/api-client';

interface TestEntity {
  id: string;
  date: string;
  name: string;
}

const createTestEntity = (overrides: Partial<TestEntity> = {}): TestEntity => ({
  id: Math.random().toString(),
  date: new Date().toISOString().split('T')[0],
  name: 'Test Entity',
  ...overrides,
});

describe('useEntityMutations', () => {
  let queryClient: QueryClient;
  let mockDeleteEntity: MockedFunction<(id: string) => Promise<void>>;
  let mockBulkDeleteEntities: MockedFunction<(ids: string[]) => Promise<void>>;

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockDeleteEntity = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);
    mockBulkDeleteEntities = vi.fn<(ids: string[]) => Promise<void>>().mockResolvedValue(undefined);
    const mockUser = { id: 'test-user', email: 'test@example.com' };
    (getCurrentUser as MockedFunction<typeof getCurrentUser>).mockResolvedValue(mockUser);

    queryClient.setQueryData(['user'], mockUser);

    vi.clearAllMocks();
  });

  describe('handleDelete', () => {
    it('should call deleteEntity and invalidate queries', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(mockDeleteEntity).toHaveBeenCalledWith('entity-1');
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['entities'] });
      expect(mockHandleSuccess).not.toHaveBeenCalled();
    });

    it('should track deletingIds during delete', async () => {
      let resolveDelete: () => void;
      const pendingDelete = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteEntity.mockReturnValue(pendingDelete);

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      expect(result.current.deletingIds.size).toBe(0);

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.handleDelete('entity-1');
      });

      await waitFor(() => {
        expect(result.current.deletingIds.has('entity-1')).toBe(true);
      });

      await act(async () => {
        resolveDelete!();
        await deletePromise;
      });

      await waitFor(() => {
        expect(result.current.deletingIds.size).toBe(0);
      });
    });

    it('should clear deletingIds and call error handler on delete error', async () => {
      const deleteError = new Error('Delete failed');
      mockDeleteEntity.mockRejectedValue(deleteError);

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(mockHandleError).toHaveBeenCalledWith(deleteError);
      expect(result.current.deletingIds.size).toBe(0);
    });

    it('should not modify cache before API response', async () => {
      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1', name: 'Entity 1' }),
        createTestEntity({ id: 'entity-2', name: 'Entity 2' }),
      ];

      queryClient.setQueryData(['entities', 'all'], entities);

      let resolveDelete: () => void;
      mockDeleteEntity.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
      );

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.handleDelete('entity-1');
      });

      await waitFor(() => {
        expect(result.current.deletingIds.has('entity-1')).toBe(true);
      });

      const cachedData = queryClient.getQueryData(['entities', 'all']) as TestEntity[];
      expect(cachedData).toHaveLength(2);
      expect(cachedData.find((e) => e.id === 'entity-1')).toBeDefined();

      await act(async () => {
        resolveDelete!();
        await deletePromise;
      });
    });
  });

  describe('handleBulkDelete', () => {
    it('should bulk delete and show success toast', async () => {
      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            bulkDeleteEntities: mockBulkDeleteEntities,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleBulkDelete(['entity-1', 'entity-2']);
      });

      expect(mockBulkDeleteEntities).toHaveBeenCalledWith(['entity-1', 'entity-2']);
      expect(mockHandleSuccess).toHaveBeenCalledWith(
        'Éléments supprimés',
        '2 éléments supprimés.'
      );
    });

    it('should throw error when bulkDeleteEntities not provided', async () => {
      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await expect(async () => {
        await result.current.handleBulkDelete(['entity-1']);
      }).rejects.toThrow('bulkDeleteEntities function not provided');
    });

    it('should track deletingIds during bulk delete', async () => {
      let resolveBulk: () => void;
      const pendingBulk = new Promise<void>((resolve) => {
        resolveBulk = resolve;
      });
      mockBulkDeleteEntities.mockReturnValue(pendingBulk);

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            bulkDeleteEntities: mockBulkDeleteEntities,
          }),
        { wrapper }
      );

      expect(result.current.deletingIds.size).toBe(0);

      let bulkPromise: Promise<void>;
      act(() => {
        bulkPromise = result.current.handleBulkDelete(['entity-1', 'entity-2']);
      });

      await waitFor(() => {
        expect(result.current.deletingIds.has('entity-1')).toBe(true);
        expect(result.current.deletingIds.has('entity-2')).toBe(true);
      });

      await act(async () => {
        resolveBulk!();
        await bulkPromise;
      });

      await waitFor(() => {
        expect(result.current.deletingIds.size).toBe(0);
      });
    });

    it('should clear deletingIds and call error handler on bulk delete error', async () => {
      const bulkDeleteError = new Error('Bulk delete failed');
      mockBulkDeleteEntities.mockRejectedValue(bulkDeleteError);

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            bulkDeleteEntities: mockBulkDeleteEntities,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleBulkDelete(['entity-1']);
      });

      expect(mockHandleError).toHaveBeenCalledWith(bulkDeleteError);
      expect(result.current.deletingIds.size).toBe(0);
    });
  });

  describe('related query keys', () => {
    it('should invalidate related query keys on delete', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            relatedQueryKeys: [['related1'], ['related2']],
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['entities'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related1'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related2'] });
    });

    it('should invalidate related query keys on bulk delete', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            bulkDeleteEntities: mockBulkDeleteEntities,
            relatedQueryKeys: [['related1'], ['related2']],
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleBulkDelete(['entity-1', 'entity-2']);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['entities'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related1'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related2'] });
    });

    it('should invalidate base and related query keys on entity success', () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useEntityMutations({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            relatedQueryKeys: [['related1'], ['related2']],
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleEntitySuccess();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['entities'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related1'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related2'] });
    });
  });

});
