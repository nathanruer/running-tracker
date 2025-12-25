import { useState } from 'react';
import { useQueryClient, InfiniteData } from '@tanstack/react-query';
import { deleteSession, bulkDeleteSessions } from '@/lib/services/api-client';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import type { TrainingSession } from '@/lib/types';

/**
 * Hook for managing session mutations with optimistic updates
 * Handles delete, bulk delete, and session success with React Query cache management
 *
 * @param selectedType Current filter type ('all' or specific session type)
 * @returns Object with mutation handlers and loading state
 *
 * @example
 * const { handleDelete, handleBulkDelete, handleSessionSuccess, isDeleting } =
 *   useSessionMutations(selectedType);
 */
export function useSessionMutations(selectedType: string) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiErrorHandler();
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handles single session deletion with optimistic updates
   * @param id Session ID to delete
   */
  const handleDelete = async (id: string) => {
    const previousAllData = queryClient.getQueryData(['sessions', 'all', selectedType]);
    const previousPaginatedData = queryClient.getQueryData(['sessions', 'paginated', selectedType]);

    await queryClient.cancelQueries({ queryKey: ['sessions'] });

    queryClient.setQueryData(
      ['sessions', 'all', selectedType],
      (old: TrainingSession[] | undefined) => old?.filter((s) => s.id !== id)
    );

    queryClient.setQueryData(
      ['sessions', 'paginated', selectedType],
      (old: InfiniteData<TrainingSession[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => page.filter((s) => s.id !== id)),
        };
      }
    );

    if (selectedType !== 'all') {
      queryClient.setQueryData(
        ['sessions', 'all', 'all'],
        (old: TrainingSession[] | undefined) => old?.filter((s) => s.id !== id)
      );
      queryClient.setQueryData(
        ['sessions', 'paginated', 'all'],
        (old: InfiniteData<TrainingSession[]> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => page.filter((s) => s.id !== id)),
          };
        }
      );
    }

    setIsDeleting(true);
    handleSuccess('Séance supprimée', 'La séance a été supprimée avec succès.');

    try {
      await deleteSession(id);

      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessionTypes'] });
    } catch (error) {
      queryClient.setQueryData(['sessions', 'all', selectedType], previousAllData);
      queryClient.setQueryData(['sessions', 'paginated', selectedType], previousPaginatedData);
      handleError(error, 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles bulk deletion of sessions with optimistic updates
   * @param ids Array of session IDs to delete
   */
  const handleBulkDelete = async (ids: string[]) => {
    const previousAllData = queryClient.getQueryData(['sessions', 'all', selectedType]);
    const previousPaginatedData = queryClient.getQueryData(['sessions', 'paginated', selectedType]);

    await queryClient.cancelQueries({ queryKey: ['sessions'] });

    queryClient.setQueryData(
      ['sessions', 'all', selectedType],
      (old: TrainingSession[] | undefined) => old?.filter((s) => !ids.includes(s.id))
    );

    queryClient.setQueryData(
      ['sessions', 'paginated', selectedType],
      (old: InfiniteData<TrainingSession[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => page.filter((s) => !ids.includes(s.id))),
        };
      }
    );

    if (selectedType !== 'all') {
      queryClient.setQueryData(
        ['sessions', 'all', 'all'],
        (old: TrainingSession[] | undefined) => old?.filter((s) => !ids.includes(s.id))
      );
      queryClient.setQueryData(
        ['sessions', 'paginated', 'all'],
        (old: InfiniteData<TrainingSession[]> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => page.filter((s) => !ids.includes(s.id))),
          };
        }
      );
    }

    try {
      setIsDeleting(true);
      await bulkDeleteSessions(ids);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessionTypes'] });
      handleSuccess('Séances supprimées', `${ids.length} séances ont été supprimées avec succès.`);
    } catch (error) {
      queryClient.setQueryData(['sessions', 'all', selectedType], previousAllData);
      queryClient.setQueryData(['sessions', 'paginated', selectedType], previousPaginatedData);
      handleError(error, 'Erreur lors de la suppression groupée');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles successful session creation/update by updating the cache
   * @param savedSession Newly created or updated session
   */
  const handleSessionSuccess = (savedSession: TrainingSession) => {
    queryClient.setQueryData(
      ['sessions', 'all', selectedType],
      (old: TrainingSession[] | undefined) => {
        if (!old) return [savedSession];

        const exists = old.find((s) => s.id === savedSession.id);
        if (exists) {
          return old.map((s) => (s.id === savedSession.id ? savedSession : s));
        } else {
          return [savedSession, ...old].sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          });
        }
      }
    );

    queryClient.setQueryData(
      ['sessions', 'paginated', selectedType],
      (old: InfiniteData<TrainingSession[]> | undefined) => {
        if (!old) return old;

        const newPages = old.pages.map((page) => {
          const index = page.findIndex((s) => s.id === savedSession.id);
          if (index !== -1) {
            const newPage = [...page];
            newPage[index] = savedSession;
            return newPage;
          }
          return page;
        });

        const existsInPages = old.pages.some((p) => p.some((s) => s.id === savedSession.id));
        if (!existsInPages && newPages.length > 0) {
          newPages[0] = [savedSession, ...newPages[0]];
        }

        return { ...old, pages: newPages };
      }
    );

    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['sessionTypes'] });
  };

  return {
    handleDelete,
    handleBulkDelete,
    handleSessionSuccess,
    isDeleting,
  };
}
