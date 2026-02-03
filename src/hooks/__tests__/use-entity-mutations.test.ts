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
    
    // Pre-populate user in cache for useQuery
    queryClient.setQueryData(['user'], mockUser);
    
    vi.clearAllMocks();
  });

  describe('handleDelete', () => {
    it('should delete entity silently (no success toast)', async () => {
      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1', name: 'Entity 1' }),
        createTestEntity({ id: 'entity-2', name: 'Entity 2' }),
      ];

      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(mockDeleteEntity).toHaveBeenCalledWith('entity-1');
      expect(mockHandleSuccess).not.toHaveBeenCalled();
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
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(mockHandleError).toHaveBeenCalledWith(deleteError);
    });

    it('should remove entity from infinite query cache', async () => {
      const entitiesPage1: TestEntity[] = [
        createTestEntity({ id: 'entity-1' }),
        createTestEntity({ id: 'entity-2' }),
      ];
      const entitiesPage2: TestEntity[] = [
        createTestEntity({ id: 'entity-3' }),
      ];

      queryClient.setQueryData(['entities', 'paginated'], {
        pages: [entitiesPage1, entitiesPage2],
        pageParams: [0, 2],
      });

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-2');
      });

      const cachedData = queryClient.getQueryData(['entities', 'paginated']) as {
        pages: TestEntity[][];
      };

      expect(cachedData.pages[0].some((e) => e.id === 'entity-2')).toBe(false);
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
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
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
            deleteEntity: mockDeleteEntity,
            bulkDeleteEntities: mockBulkDeleteEntities,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleBulkDelete(['entity-1']);
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        bulkDeleteError
      );
    });

    it('should set deleting state during bulk delete', async () => {
      let resolveBulk: () => void;
      const pendingBulk = new Promise<void>((resolve) => {
        resolveBulk = resolve;
      });
      mockBulkDeleteEntities.mockReturnValue(pendingBulk);

      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1' }),
        createTestEntity({ id: 'entity-2' }),
      ];

      queryClient.setQueryData(['entities', 'all'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            bulkDeleteEntities: mockBulkDeleteEntities,
          }),
        { wrapper }
      );

      expect(result.current.isDeleting).toBe(false);

      let bulkPromise: Promise<void>;
      act(() => {
        bulkPromise = result.current.handleBulkDelete(['entity-1']);
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      await act(async () => {
        resolveBulk!();
        await bulkPromise;
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
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

    it('should insert into first page for infinite queries', () => {
      const page1: TestEntity[] = [createTestEntity({ id: 'entity-1', date: '2024-01-10' })];
      const page2: TestEntity[] = [createTestEntity({ id: 'entity-2', date: '2024-01-09' })];

      queryClient.setQueryData(['entities', 'paginated'], {
        pages: [page1, page2],
        pageParams: [0, 10],
      });

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      const newEntity = createTestEntity({ id: 'entity-3', date: '2024-01-15' });

      act(() => {
        result.current.handleEntitySuccess(newEntity);
      });

      const cachedData = queryClient.getQueryData(['entities', 'paginated']) as {
        pages: TestEntity[][];
      };

      expect(cachedData.pages[0][0].id).toBe('entity-3');
    });

    it('should update entity inside infinite pages', () => {
      const page1: TestEntity[] = [createTestEntity({ id: 'entity-1', name: 'old' })];

      queryClient.setQueryData(['entities', 'paginated'], {
        pages: [page1],
        pageParams: [0],
      });

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleEntitySuccess(createTestEntity({ id: 'entity-1', name: 'new' }));
      });

      const cachedData = queryClient.getQueryData(['entities', 'paginated']) as {
        pages: TestEntity[][];
      };

      expect(cachedData.pages[0][0].name).toBe('new');
    });

    it('should respect custom sort function', () => {
      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1', date: '2024-01-01', name: 'B' }),
      ];

      queryClient.setQueryData(['entities', 'all'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            sortFn: (a, b) => a.name.localeCompare(b.name),
          }),
        { wrapper }
      );

      const newEntity = createTestEntity({ id: 'entity-2', date: '2024-01-02', name: 'A' });

      act(() => {
        result.current.handleEntitySuccess(newEntity);
      });

      const cachedData = queryClient.getQueryData(['entities', 'all']) as TestEntity[];
      expect(cachedData[0].name).toBe('A');
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
            deleteEntity: mockDeleteEntity,
            relatedQueryKeys: [['related1'], ['related2']],
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related1'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related2'] });
    });

    it('should invalidate related query keys on bulk delete', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const entities: TestEntity[] = [
        createTestEntity({ id: 'entity-1' }),
        createTestEntity({ id: 'entity-2' }),
      ];
      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
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

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related1'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related2'] });
    });

    it('should invalidate related query keys on entity success', () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const entities: TestEntity[] = [createTestEntity({ id: 'entity-1' })];
      queryClient.setQueryData(['entities', 'all', 'all', 'test-user'], entities);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
            relatedQueryKeys: [['related1'], ['related2']],
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleEntitySuccess(createTestEntity({ id: 'entity-2' }));
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related1'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['related2'] });
    });
  });

  describe('edge cases with unrecognized data formats', () => {
    it('should return old data unchanged in removeFromCache when format is unrecognized', async () => {
      // Set up an object that is neither an array nor has pages property
      const unknownFormat = { someKey: 'someValue' };
      queryClient.setQueryData(['entities', 'unknown'], unknownFormat);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDelete('entity-1');
      });

      // The unknown format should remain unchanged
      const cachedData = queryClient.getQueryData(['entities', 'unknown']);
      expect(cachedData).toEqual(unknownFormat);
    });

    it('should return old data unchanged in handleEntitySuccess when format is unrecognized', () => {
      // Set up an object that is neither an array nor has pages property
      const unknownFormat = { someKey: 'someValue' };
      queryClient.setQueryData(['entities', 'unknown'], unknownFormat);

      const { result } = renderHook(
        () =>
          useEntityMutations<TestEntity>({
            baseQueryKey: 'entities',
            deleteEntity: mockDeleteEntity,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleEntitySuccess(createTestEntity({ id: 'new-entity' }));
      });

      // The unknown format should remain unchanged
      const cachedData = queryClient.getQueryData(['entities', 'unknown']);
      expect(cachedData).toEqual(unknownFormat);
    });
  });
});
