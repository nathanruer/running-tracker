import { useState, useCallback } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/use-error-handler';

interface UseEntityMutationsOptions {
  baseQueryKey: string;
  deleteEntity: (id: string) => Promise<void>;
  bulkDeleteEntities?: (ids: string[]) => Promise<void>;
  relatedQueryKeys?: QueryKey[];
  messages?: {
    bulkDeleteSuccessTitle?: string;
    bulkDeleteSuccess?: (count: number) => string;
  };
}

export function useEntityMutations(options: UseEntityMutationsOptions) {
  const {
    baseQueryKey,
    deleteEntity,
    bulkDeleteEntities,
    relatedQueryKeys = [],
    messages = {},
  } = options;

  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandler({ scope: 'global' });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const defaultMessages = {
    bulkDeleteSuccessTitle: 'Éléments supprimés',
    bulkDeleteSuccess: (count: number) => `${count} élément${count > 1 ? 's' : ''} supprimé${count > 1 ? 's' : ''}.`,
    ...messages,
  };

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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [baseQueryKey] }),
      ...relatedQueryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    ]);
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

  const handleEntitySuccess = useCallback(() => {
    void invalidateAll();
  }, [invalidateAll]);

  return {
    handleDelete,
    handleBulkDelete,
    handleEntitySuccess,
    deletingIds,
  };
}
