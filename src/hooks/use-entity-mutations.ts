import { useState } from 'react';
import { useQueryClient, InfiniteData, QueryKey } from '@tanstack/react-query';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';

/**
 * Configuration options for useEntityMutations hook
 */
interface UseEntityMutationsOptions<T> {
  /** Base query key for the entity (e.g., ['sessions'], ['conversations']) */
  baseQueryKey: string;
  /** Current filter type (e.g., 'all' or specific type) */
  filterType: string;
  /** Function to delete a single entity */
  deleteEntity: (id: string) => Promise<void>;
  /** Function to bulk delete entities */
  bulkDeleteEntities?: (ids: string[]) => Promise<void>;
  /** Additional query keys to invalidate on mutations */
  relatedQueryKeys?: string[];
  /** Success messages */
  messages?: {
    deleteSuccess?: string;
    deleteSuccessDescription?: string;
    bulkDeleteSuccessTitle?: string;
    bulkDeleteSuccess?: (count: number) => string;
    deleteError?: string;
    bulkDeleteError?: string;
  };
  /** Function to sort entities after creation/update (default: by date DESC) */
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
    filterType,
    deleteEntity,
    bulkDeleteEntities,
    relatedQueryKeys = [],
    messages = {},
    sortFn,
  } = options;

  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiErrorHandler();
  const [isDeleting, setIsDeleting] = useState(false);

  // Default messages
  const defaultMessages = {
    deleteSuccess: 'Élément supprimé',
    deleteSuccessDescription: "L'élément a été supprimé avec succès.",
    bulkDeleteSuccessTitle: 'Éléments supprimés',
    bulkDeleteSuccess: (count: number) => `${count} éléments ont été supprimés avec succès.`,
    deleteError: 'Erreur lors de la suppression',
    bulkDeleteError: 'Erreur lors de la suppression groupée',
    ...messages,
  };

  // Default sort function: by date DESC
  const defaultSortFn = (a: T, b: T) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  };

  const sortEntities = sortFn || defaultSortFn;

  // Helper to build query keys
  const buildQueryKey = (variant: 'all' | 'paginated', type: string): QueryKey => [
    baseQueryKey,
    variant,
    type,
  ];

  /**
   * Update cache by removing entities matching the predicate
   */
  const removeFromCache = (predicate: (entity: T) => boolean) => {
    // Update current filter cache
    queryClient.setQueryData(
      buildQueryKey('all', filterType),
      (old: T[] | undefined) => old?.filter((item) => !predicate(item))
    );

    queryClient.setQueryData(
      buildQueryKey('paginated', filterType),
      (old: InfiniteData<T[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => page.filter((item) => !predicate(item))),
        };
      }
    );

    // Update 'all' filter if current filter is specific
    if (filterType !== 'all') {
      queryClient.setQueryData(
        buildQueryKey('all', 'all'),
        (old: T[] | undefined) => old?.filter((item) => !predicate(item))
      );

      queryClient.setQueryData(
        buildQueryKey('paginated', 'all'),
        (old: InfiniteData<T[]> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => page.filter((item) => !predicate(item))),
          };
        }
      );
    }
  };

  /**
   * Handles single entity deletion with optimistic updates
   * @param id Entity ID to delete
   */
  const handleDelete = async (id: string) => {
    // Save previous data for rollback
    const previousAllData = queryClient.getQueryData(buildQueryKey('all', filterType));
    const previousPaginatedData = queryClient.getQueryData(buildQueryKey('paginated', filterType));

    // Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey: [baseQueryKey] });

    // Optimistically remove from cache
    removeFromCache((item) => item.id === id);

    setIsDeleting(true);
    handleSuccess(defaultMessages.deleteSuccess, defaultMessages.deleteSuccessDescription);

    try {
      await deleteEntity(id);

      // Invalidate related queries
      await queryClient.invalidateQueries({ queryKey: [baseQueryKey] });
      relatedQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(buildQueryKey('all', filterType), previousAllData);
      queryClient.setQueryData(buildQueryKey('paginated', filterType), previousPaginatedData);
      handleError(error, defaultMessages.deleteError);
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

    // Save previous data for rollback
    const previousAllData = queryClient.getQueryData(buildQueryKey('all', filterType));
    const previousPaginatedData = queryClient.getQueryData(buildQueryKey('paginated', filterType));

    // Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey: [baseQueryKey] });

    // Optimistically remove from cache
    removeFromCache((item) => ids.includes(item.id));

    try {
      setIsDeleting(true);
      await bulkDeleteEntities(ids);

      // Invalidate related queries
      await queryClient.invalidateQueries({ queryKey: [baseQueryKey] });
      relatedQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      handleSuccess(
        defaultMessages.bulkDeleteSuccessTitle,
        defaultMessages.bulkDeleteSuccess(ids.length)
      );
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(buildQueryKey('all', filterType), previousAllData);
      queryClient.setQueryData(buildQueryKey('paginated', filterType), previousPaginatedData);
      handleError(error, defaultMessages.bulkDeleteError);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles successful entity creation/update by updating the cache
   * @param savedEntity Newly created or updated entity
   */
  const handleEntitySuccess = (savedEntity: T) => {
    // Update 'all' cache
    queryClient.setQueryData(
      buildQueryKey('all', filterType),
      (old: T[] | undefined) => {
        if (!old) return [savedEntity];

        const exists = old.find((item) => item.id === savedEntity.id);
        if (exists) {
          // Update existing entity
          return old.map((item) => (item.id === savedEntity.id ? savedEntity : item));
        } else {
          // Add new entity and sort
          return [savedEntity, ...old].sort(sortEntities);
        }
      }
    );

    // Update paginated cache
    queryClient.setQueryData(
      buildQueryKey('paginated', filterType),
      (old: InfiniteData<T[]> | undefined) => {
        if (!old) return old;

        // Try to update existing entity in pages
        const newPages = old.pages.map((page) => {
          const index = page.findIndex((item) => item.id === savedEntity.id);
          if (index !== -1) {
            const newPage = [...page];
            newPage[index] = savedEntity;
            return newPage;
          }
          return page;
        });

        // If entity doesn't exist in pages, add to first page
        const existsInPages = old.pages.some((p) => p.some((item) => item.id === savedEntity.id));
        if (!existsInPages && newPages.length > 0) {
          newPages[0] = [savedEntity, ...newPages[0]];
        }

        return { ...old, pages: newPages };
      }
    );

    // Invalidate to ensure consistency
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
