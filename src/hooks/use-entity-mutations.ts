import { useState } from 'react';
import { useQueryClient, InfiniteData, type QueryKey } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/use-error-handler';

/**
 * Configuration options for useEntityMutations hook
 */
interface UseEntityMutationsOptions<T> {
  baseQueryKey: string;
  deleteEntity: (id: string) => Promise<void>;
  bulkDeleteEntities?: (ids: string[]) => Promise<void>;
  relatedQueryKeys?: QueryKey[];
  messages?: {
    bulkDeleteSuccessTitle?: string;
    bulkDeleteSuccess?: (count: number) => string;
  };
  sortFn?: (a: T, b: T) => number;
  invalidateOnEntitySuccess?: boolean;
  shouldIncludeEntityInQuery?: (queryKey: QueryKey, entity: T) => boolean;
  pageSize?: number;
  /**
   * If true, skip immediate refetch after delete operations.
   * The optimistic update handles the UI, and data is marked stale for next access.
   * This significantly improves perceived performance for deletions.
   * @default true
   */
  skipRefetchOnDelete?: boolean;
}

/**
 * Generic hook for managing entity mutations with optimistic updates
 * Handles delete, bulk delete, and entity success with React Query cache management
 *
 * @template T Entity type (e.g., TrainingSession, Conversation)
 * @param options Configuration options
 * @returns Object with mutation handlers and loading state
 *
 * @example
 * const { handleDelete, handleBulkDelete, handleEntitySuccess, isDeleting } =
 *   useEntityMutations<TrainingSession>({
 *     baseQueryKey: 'sessions',
 *     deleteEntity: deleteSession,
 *     bulkDeleteEntities: bulkDeleteSessions,
 *     relatedQueryKeys: [queryKeys.sessionTypesBase()],
 *   });
 */
export function useEntityMutations<T extends { id: string; date?: string | Date | null }>(
  options: UseEntityMutationsOptions<T>
) {
  const {
    baseQueryKey,
    deleteEntity,
    bulkDeleteEntities,
    relatedQueryKeys = [],
    messages = {},
    sortFn,
    invalidateOnEntitySuccess = true,
    shouldIncludeEntityInQuery,
    pageSize,
    skipRefetchOnDelete = true,
  } = options;

  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandler({ scope: 'global' });
  const [isDeleting, setIsDeleting] = useState(false);

  const defaultMessages = {
    bulkDeleteSuccessTitle: 'Éléments supprimés',
    bulkDeleteSuccess: (count: number) => `${count} élément${count > 1 ? 's' : ''} supprimé${count > 1 ? 's' : ''}.`,
    ...messages,
  };

  const defaultSortFn = (a: T, b: T) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  };

  const sortEntities = sortFn || defaultSortFn;

  const upsertEntityInCollection = (
    collection: T[],
    savedEntity: T,
    shouldInclude: boolean
  ) => {
    const index = collection.findIndex((item) => item.id === savedEntity.id);

    if (!shouldInclude) {
      if (index === -1) return collection;
      return collection.filter((item) => item.id !== savedEntity.id);
    }

    if (index !== -1) {
      const next = [...collection];
      next[index] = savedEntity;
      return next;
    }

    return [savedEntity, ...collection].sort(sortEntities);
  };

  const upsertEntityInInfiniteCollection = (
    data: InfiniteData<T[]>,
    savedEntity: T,
    shouldInclude: boolean
  ) => {
    const existsInPages = data.pages.some(
      (page) => Array.isArray(page) && page.some((item) => item.id === savedEntity.id)
    );

    let changed = false;
    const pages = data.pages.map((page) => {
      if (!Array.isArray(page)) return page;

      const index = page.findIndex((item) => item.id === savedEntity.id);

      if (!shouldInclude) {
        if (index === -1) return page;
        changed = true;
        return page.filter((item) => item.id !== savedEntity.id);
      }

      if (index !== -1) {
        const next = [...page];
        next[index] = savedEntity;
        changed = true;
        return next;
      }

      return page;
    });

    if (!shouldInclude) {
      return changed ? { ...data, pages } : data;
    }

    if (!existsInPages && pages.length > 0 && Array.isArray(pages[0])) {
      pages[0] = [savedEntity, ...pages[0]].sort(sortEntities);
      changed = true;
    }

    if (pageSize && pages.length > 0 && Array.isArray(pages[0]) && pages[0].length > pageSize) {
      pages[0] = pages[0].slice(0, pageSize);
      changed = true;
    }

    return changed ? { ...data, pages } : data;
  };

  const updateQueryDataWithEntity = (
    old: T[] | InfiniteData<T[]> | undefined,
    savedEntity: T,
    shouldInclude: boolean
  ) => {
    if (!old) return old;

    if (Array.isArray(old)) {
      return upsertEntityInCollection(old, savedEntity, shouldInclude);
    }

    if ('pages' in old && Array.isArray(old.pages)) {
      return upsertEntityInInfiniteCollection(old, savedEntity, shouldInclude);
    }

    return old;
  };

  /**
   * Snapshots all queries matching baseQueryKey for rollback
   */
  const snapshotQueries = (): Array<[QueryKey, unknown]> =>
    queryClient.getQueriesData({ queryKey: [baseQueryKey] });

  /**
   * Restores queries from snapshot
   */
  const restoreFromSnapshot = (snapshot: Array<[QueryKey, unknown]>) => {
    for (const [key, data] of snapshot) {
      queryClient.setQueryData(key, data);
    }
  };

  /**
   * Removes entities from ALL matching queries (handles any query key structure)
   */
  const removeFromCache = (predicate: (entity: T) => boolean) => {
    queryClient.setQueriesData<T[] | InfiniteData<T[]>>(
      { queryKey: [baseQueryKey] },
      (old) => {
        if (!old) return old;

        // Handle array format (simple queries)
        if (Array.isArray(old)) {
          return old.filter((item) => !predicate(item));
        }

        // Handle infinite query format
        if ('pages' in old && Array.isArray(old.pages)) {
          return {
            ...old,
            pages: old.pages.map((page) =>
              Array.isArray(page) ? page.filter((item) => !predicate(item)) : page
            ),
          };
        }

        return old;
      }
    );
  };

  /**
   * Handles single entity deletion with optimistic updates.
   * When skipRefetchOnDelete is true (default), data is marked stale without immediate refetch.
   * This provides instant UI feedback while ensuring fresh data on next access.
   * @param id Entity ID to delete
   */
  const handleDelete = async (id: string) => {
    const snapshot = snapshotQueries();

    await queryClient.cancelQueries({ queryKey: [baseQueryKey] });

    removeFromCache((item) => item.id === id);

    setIsDeleting(true);

    try {
      await deleteEntity(id);

      // When skipRefetchOnDelete is true, mark as stale without immediate refetch.
      // The optimistic update already reflects the deletion in the UI.
      // Data will be refetched on next access (e.g., page navigation, window focus).
      const refetchType = skipRefetchOnDelete ? 'none' : 'active';
      await queryClient.invalidateQueries({ 
        queryKey: [baseQueryKey],
        refetchType,
      });
      relatedQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key, refetchType });
      });
    } catch (error) {
      // Rollback all queries from snapshot
      restoreFromSnapshot(snapshot);
      handleError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles bulk deletion of entities with optimistic updates
   * @param ids Array of entity IDs to delete
   */
  const handleBulkDelete = async (ids: string[]) => {
    if (!bulkDeleteEntities) {
      throw new Error('bulkDeleteEntities function not provided');
    }

    // Snapshot ALL matching queries for rollback
    const snapshot = snapshotQueries();

    await queryClient.cancelQueries({ queryKey: [baseQueryKey] });

    // Optimistically remove from ALL matching caches
    removeFromCache((item) => ids.includes(item.id));

    try {
      setIsDeleting(true);
      await bulkDeleteEntities(ids);

      // When skipRefetchOnDelete is true, mark as stale without immediate refetch.
      // The optimistic update already reflects the deletions in the UI.
      const refetchType = skipRefetchOnDelete ? 'none' : 'active';
      await queryClient.invalidateQueries({ 
        queryKey: [baseQueryKey],
        refetchType,
      });
      relatedQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key, refetchType });
      });

      handleSuccess(
        defaultMessages.bulkDeleteSuccessTitle,
        defaultMessages.bulkDeleteSuccess(ids.length)
      );
    } catch (error) {
      // Rollback all queries from snapshot
      restoreFromSnapshot(snapshot);
      handleError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles successful entity creation/update by updating the cache
   * @param savedEntity Newly created or updated entity
   */
  const handleEntitySuccess = (savedEntity: T) => {
    const queries = queryClient.getQueriesData<T[] | InfiniteData<T[]>>({
      queryKey: [baseQueryKey],
    });

    for (const [queryKey, data] of queries) {
      const shouldInclude = shouldIncludeEntityInQuery
        ? shouldIncludeEntityInQuery(queryKey, savedEntity)
        : true;
      const nextData = updateQueryDataWithEntity(data, savedEntity, shouldInclude);

      if (nextData !== data) {
        queryClient.setQueryData(queryKey, nextData);
      }
    }

    if (invalidateOnEntitySuccess) {
      queryClient.invalidateQueries({ queryKey: [baseQueryKey] });
    }
    relatedQueryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };

  return {
    handleDelete,
    handleBulkDelete,
    handleEntitySuccess,
    isDeleting,
  };
}
