import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useEntityMutations } from '../use-entity-mutations';

const mockHandleError = vi.fn();
const mockHandleSuccess = vi.fn();

vi.mock('@/hooks/use-api-error-handler', () => ({
  useApiErrorHandler: () => ({
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
    
    // Pre-populate user in cache for useQuery
    queryClient.setQueryData(['user'], mockUser);
    
    vi.clearAllMocks();
  });

  describe('handleDelete', () => {
    it('should delete entity and show success message', async () => {
      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1', name: 'Entity 1' }),
        createTestEntity({ id: 'entity-2', name: 'Entity 2' }),
      ];

      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(mockDeleteEntity).toHaveBeenCalledWith('entity-1');
      expect(mockHandleSuccess).toHaveBeenCalledWith(
        'Élément supprimé',
        "L'élément a été supprimé avec succès."
      );
    });

    it('should rollback on delete error', async () => {
      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1', name: 'Entity 1' }),
      ];

      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const deleteError = new Error('Delete failed');
      mockDeleteEntity.mockRejectedValue(deleteError);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(mockHandleError).toHaveBeenCalledWith(deleteError, 'Erreur lors de la suppression');
    });

    it('should use custom success messages', async () => {
      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1' }),
      ];

      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
            messages: {
              deleteSuccess: 'Custom Success',
              deleteSuccessDescription: 'Custom Description',
            },
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(mockHandleSuccess).toHaveBeenCalledWith('Custom Success', 'Custom Description');
    });
  });

  describe('handleBulkDelete', () => {
    it('should bulk delete entities', async () => {
      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1' }),
        createTestEntity({ id: 'entity-2' }),
        createTestEntity({ id: 'entity-3' }),
      ];

      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
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
        '2 éléments ont été supprimés avec succès.'
      );
    });

    it('should throw error when bulkDeleteEntities not provided', async () => {
      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await expect(async () => {
        await result.current.handleBulkDelete(['entity-1']);
      }).rejects.toThrow('bulkDeleteEntities function not provided');
    });

    it('should rollback on bulk delete error', async () => {
      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1' }),
        createTestEntity({ id: 'entity-2' }),
      ];

      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const bulkDeleteError = new Error('Bulk delete failed');
      mockBulkDeleteEntities.mockRejectedValue(bulkDeleteError);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
            bulkDeleteEntities: mockBulkDeleteEntities,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleBulkDelete(['entity-1']);
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        bulkDeleteError,
        'Erreur lors de la suppression groupée'
      );
    });
  });

  describe('handleEntitySuccess', () => {
    it('should add new entity to cache', async () => {
      const existingEntities: TestEntity[] = [
        createTestEntity({ id: 'entity-1', date: '2024-01-10' }),
      ];

      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], existingEntities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      const newEntity = createTestEntity({ id: 'entity-2', date: '2024-01-15' });

      act(() => {
        result.current.handleEntitySuccess(newEntity);
      });

      const cachedData = queryClient.getQueryData(['entities', 'all', 'all', 'test-user']) as TestEntity[];
      expect(cachedData).toHaveLength(2);
      expect(cachedData.find((e) => e.id === 'entity-2')).toBeDefined();
    });

    it('should update existing entity in cache', async () => {
      const existingEntities: TestEntity[] = [
        createTestEntity({ id: 'entity-1', name: 'Original Name' }),
      ];

      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], existingEntities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      const updatedEntity = createTestEntity({ id: 'entity-1', name: 'Updated Name' });

      act(() => {
        result.current.handleEntitySuccess(updatedEntity);
      });

      const cachedData = queryClient.getQueryData(['entities', 'all', 'all', 'test-user']) as TestEntity[];
      expect(cachedData).toHaveLength(1);
      expect(cachedData[0].name).toBe('Updated Name');
    });
  });

  describe('isDeleting state', () => {
    it('should track deleting state', async () => {
      let resolveDelete: () => void;
      const pendingDelete = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteEntity.mockReturnValue(pendingDelete);

      const entities: TestEntity[] = [createTestEntity({ id: 'entity-1' })];
      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      expect(result.current.isDeleting).toBe(false);

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.handleDelete('entity-1');
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      await act(async () => {
        resolveDelete!();
        await deletePromise;
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });

  describe('related query keys', () => {
    it('should invalidate related query keys on delete', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const entities: TestEntity[] = [createTestEntity({ id: 'entity-1' })];
      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            filterType: 'all',
            deleteEntity: mockDeleteEntity,
            relatedQueryKeys: ['related1', 'related2'],
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related1'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related2'] });
    });
  });
});
