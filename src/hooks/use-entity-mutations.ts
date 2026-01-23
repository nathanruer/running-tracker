import { useState } from 'react';
import { useQueryClient, InfiniteData, QueryKey, useQuery } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { getCurrentUser } from '@/lib/services/api-client';

/**
 * Configuration options for useEntityMutations hook
 */
interface UseEntityMutationsOptions<T> {
  baseQueryKey: string;
  filterType: string;
  deleteEntity: (id: string) => Promise<void>;
  bulkDeleteEntities?: (ids: string[]) => Promise<void>;
  relatedQueryKeys?: string[];
  messages?: {
    deleteSuccess?: string;
    deleteSuccessDescription?: string;
    bulkDeleteSuccessTitle?: string;
    bulkDeleteSuccess?: (count: number) => string;
    deleteError?: string;
    bulkDeleteError?: string;
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
    filterType,
    deleteEntity,
    bulkDeleteEntities,
    relatedQueryKeys = [],
    messages = {},
    sortFn,
  } = options;

  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandler({ scope: 'global' });
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const defaultMessages = {
    deleteSuccess: 'Élément supprimé',
    deleteSuccessDescription: "L'élément a été supprimé avec succès.",
    bulkDeleteSuccessTitle: 'Éléments supprimés',
    bulkDeleteSuccess: (count: number) => `${count} éléments ont été supprimés avec succès.`,
    deleteError: 'Erreur lors de la suppression',
    bulkDeleteError: 'Erreur lors de la suppression groupée',
    ...messages,
  };

  const defaultSortFn = (a: T, b: T) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  };

  const sortEntities = sortFn || defaultSortFn;

  const buildQueryKey = (variant: 'all' | 'paginated', type: string): QueryKey => [
    baseQueryKey,
    variant,
    type,
    user?.id
  ];

  const removeFromCache = (predicate: (entity: T) => boolean) => {
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
    const previousAllData = queryClient.getQueryData(buildQueryKey('all', filterType));
    const previousPaginatedData = queryClient.getQueryData(buildQueryKey('paginated', filterType));

    await queryClient.cancelQueries({ queryKey: [baseQueryKey] });

    removeFromCache((item) => item.id === id);

    setIsDeleting(true);
    handleSuccess(defaultMessages.deleteSuccess, defaultMessages.deleteSuccessDescription);

    try {
      await deleteEntity(id);

      await queryClient.invalidateQueries({ queryKey: [baseQueryKey] });
      relatedQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    } catch (error) {
      queryClient.setQueryData(buildQueryKey('all', filterType), previousAllData);
      queryClient.setQueryData(buildQueryKey('paginated', filterType), previousPaginatedData);
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

    const previousAllData = queryClient.getQueryData(buildQueryKey('all', filterType));
    const previousPaginatedData = queryClient.getQueryData(buildQueryKey('paginated', filterType));

    await queryClient.cancelQueries({ queryKey: [baseQueryKey] });

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
      queryClient.setQueryData(buildQueryKey('all', filterType), previousAllData);
      queryClient.setQueryData(buildQueryKey('paginated', filterType), previousPaginatedData);
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
    queryClient.setQueryData(
      buildQueryKey('all', filterType),
      (old: T[] | undefined) => {
        if (!old) return [savedEntity];

        const exists = old.find((item) => item.id === savedEntity.id);
        if (exists) {
          return old.map((item) => (item.id === savedEntity.id ? savedEntity : item));
        } else {
          return [savedEntity, ...old].sort(sortEntities);
        }
      }
    );

    queryClient.setQueryData(
      buildQueryKey('paginated', filterType),
      (old: InfiniteData<T[]> | undefined) => {
        if (!old) return old;

        const newPages = old.pages.map((page) => {
          const index = page.findIndex((item) => item.id === savedEntity.id);
          if (index !== -1) {
            const newPage = [...page];
            newPage[index] = savedEntity;
            return newPage;
          }
          return page;
        });

        const existsInPages = old.pages.some((p) => p.some((item) => item.id === savedEntity.id));
        if (!existsInPages && newPages.length > 0) {
          newPages[0] = [savedEntity, ...newPages[0]];
        }

        return { ...old, pages: newPages };
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
