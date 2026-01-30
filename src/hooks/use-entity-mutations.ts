import { useState } from 'react';
import { useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/use-error-handler';

/**
 * Configuration options for useEntityMutations hook
 */
interface UseEntityMutationsOptions<T> {
  baseQueryKey: string;
  /** @deprecated No longer used - cache updates now apply to all matching queries */
  filterType?: string;
  deleteEntity: (id: string) => Promise<void>;
  bulkDeleteEntities?: (ids: string[]) => Promise<void>;
  relatedQueryKeys?: string[];
  messages?: {
    bulkDeleteSuccessTitle?: string;
    bulkDeleteSuccess?: (count: number) => string;
  };
  sortFn?: (a: T, b: T) => number;
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
 *     filterType: selectedType,
 *     deleteEntity: deleteSession,
 *     bulkDeleteEntities: bulkDeleteSessions,
 *     relatedQueryKeys: ['sessionTypes'],
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

  /**
   * Snapshots all queries matching baseQueryKey for rollback
   */
  const snapshotQueries = (): Map<string, unknown> => {
    const snapshot = new Map<string, unknown>();
    const queries = queryClient.getQueriesData({ queryKey: [baseQueryKey] });
    for (const [key, data] of queries) {
      snapshot.set(JSON.stringify(key), data);
    }
    return snapshot;
  };

  /**
   * Restores queries from snapshot
   */
  const restoreFromSnapshot = (snapshot: Map<string, unknown>) => {
    for (const [keyStr, data] of snapshot) {
      const key = JSON.parse(keyStr);
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
   * Handles single entity deletion with optimistic updates
   * @param id Entity ID to delete
   */
  const handleDelete = async (id: string) => {
    const snapshot = snapshotQueries();

    await queryClient.cancelQueries({ queryKey: [baseQueryKey] });

    removeFromCache((item) => item.id === id);

    setIsDeleting(true);

    try {
      await deleteEntity(id);

      await queryClient.invalidateQueries({ queryKey: [baseQueryKey] });
      relatedQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
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

      await queryClient.invalidateQueries({ queryKey: [baseQueryKey] });
      relatedQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
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
    // Update ALL matching queries (handles any query key structure)
    queryClient.setQueriesData<T[] | InfiniteData<T[]>>(
      { queryKey: [baseQueryKey] },
      (old) => {
        if (!old) return old;

        // Handle array format (simple queries)
        if (Array.isArray(old)) {
          const exists = old.find((item) => item.id === savedEntity.id);
          if (exists) {
            return old.map((item) => (item.id === savedEntity.id ? savedEntity : item));
          } else {
            return [savedEntity, ...old].sort(sortEntities);
          }
        }

        // Handle infinite query format
        if ('pages' in old && Array.isArray(old.pages)) {
          const newPages = old.pages.map((page) => {
            if (!Array.isArray(page)) return page;
            const index = page.findIndex((item) => item.id === savedEntity.id);
            if (index !== -1) {
              const newPage = [...page];
              newPage[index] = savedEntity;
              return newPage;
            }
            return page;
          });

          const existsInPages = old.pages.some((p) =>
            Array.isArray(p) && p.some((item) => item.id === savedEntity.id)
          );
          if (!existsInPages && newPages.length > 0 && Array.isArray(newPages[0])) {
            newPages[0] = [savedEntity, ...newPages[0]];
          }

          return { ...old, pages: newPages };
        }

        return old;
      }
    );

    queryClient.invalidateQueries({ queryKey: [baseQueryKey] });
    relatedQueryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  return {
    handleDelete,
    handleBulkDelete,
    handleEntitySuccess,
    isDeleting,
  };
}
