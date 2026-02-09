import { useState, useCallback } from 'react';
import { useQueryClient, InfiniteData, type QueryKey } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/use-error-handler';

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
}

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
  } = options;

  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandler({ scope: 'global' });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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

  const addToDeletingIds = useCallback((ids: string[]) => {
    setDeletingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const removeFromDeletingIds = useCallback((ids: string[]) => {
    setDeletingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [baseQueryKey] });
    for (const key of relatedQueryKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, [queryClient, baseQueryKey, relatedQueryKeys]);

  const handleDelete = async (id: string) => {
    addToDeletingIds([id]);
    try {
      await deleteEntity(id);
      await invalidateAll();
    } catch (error) {
      handleError(error);
    } finally {
      removeFromDeletingIds([id]);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!bulkDeleteEntities) {
      throw new Error('bulkDeleteEntities function not provided');
    }

    addToDeletingIds(ids);

    try {
      await bulkDeleteEntities(ids);
      await invalidateAll();
      handleSuccess(
        defaultMessages.bulkDeleteSuccessTitle,
        defaultMessages.bulkDeleteSuccess(ids.length)
      );
    } catch (error) {
      handleError(error);
    } finally {
      removeFromDeletingIds(ids);
    }
  };

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
    deletingIds,
  };
}
