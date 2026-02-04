import { useState } from 'react';
import { useMutation, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { AIRecommendedSession, TrainingSession } from '@/lib/types';
import {
  sendMessage as apiSendMessage,
  deleteSession,
  addPlannedSession,
  type ConversationWithMessages,
} from '@/lib/services/api-client';
import { isFractionneType } from '@/lib/utils/session-type';
import { queryKeys } from '@/lib/constants/query-keys';
import { compareValues, getClientSortValue, parseSortParam, SORTABLE_COLUMNS } from '@/lib/domain/sessions/sorting';

const PAGE_SIZE = 10;

const matchesSessionFilters = (
  session: TrainingSession,
  filters: {
    selectedType?: string;
    search?: string;
    dateFrom?: string;
    userId?: string | null;
  }
) => {
  if (filters.userId && session.userId !== filters.userId) return false;

  const selectedType = filters.selectedType ?? 'all';
  if (selectedType !== 'all' && session.sessionType !== selectedType) return false;

  const search = filters.search?.trim().toLowerCase() ?? '';
  if (search) {
    const comments = session.comments?.toLowerCase() ?? '';
    const sessionType = session.sessionType?.toLowerCase() ?? '';
    if (!comments.includes(search) && !sessionType.includes(search)) return false;
  }

  if (filters.dateFrom && session.status !== 'planned') {
    if (session.date) {
      if (new Date(session.date).getTime() < new Date(filters.dateFrom).getTime()) return false;
    }
  }

  return true;
};

const buildSortFn = (sortKey?: string) => {
  const sortConfig = parseSortParam(sortKey && sortKey !== 'default' ? sortKey : null);

  if (!sortConfig.length) {
    return (a: TrainingSession, b: TrainingSession) => {
      const statusCompare = compareValues(a.status ?? null, b.status ?? null, 'desc');
      if (statusCompare !== 0) return statusCompare;
      return compareValues(a.sessionNumber ?? null, b.sessionNumber ?? null, 'desc');
    };
  }

  return (a: TrainingSession, b: TrainingSession) => {
    for (const item of sortConfig) {
      const columnConfig = SORTABLE_COLUMNS[item.column];
      const valueA = getClientSortValue(a, item.column);
      const valueB = getClientSortValue(b, item.column);
      const invertDirection = 'invertDirection' in columnConfig ? !!columnConfig.invertDirection : false;
      const cmp = compareValues(valueA, valueB, item.direction, invertDirection);
      if (cmp !== 0) return cmp;
    }
    return 0;
  };
};

const upsertSessionInCollection = (
  collection: TrainingSession[],
  session: TrainingSession,
  shouldInclude: boolean,
  sortFn: (a: TrainingSession, b: TrainingSession) => number
) => {
  const index = collection.findIndex((item) => item.id === session.id);

  if (!shouldInclude) {
    if (index === -1) return collection;
    return collection.filter((item) => item.id !== session.id);
  }

  if (index !== -1) {
    const next = [...collection];
    next[index] = session;
    return next;
  }

  return [session, ...collection].sort(sortFn);
};

const upsertSessionInInfinite = (
  data: InfiniteData<TrainingSession[]>,
  session: TrainingSession,
  shouldInclude: boolean,
  sortFn: (a: TrainingSession, b: TrainingSession) => number
) => {
  const existsInPages = data.pages.some(
    (page) => Array.isArray(page) && page.some((item) => item.id === session.id)
  );

  let changed = false;
  const pages = data.pages.map((page) => {
    if (!Array.isArray(page)) return page;
    const index = page.findIndex((item) => item.id === session.id);

    if (!shouldInclude) {
      if (index === -1) return page;
      changed = true;
      return page.filter((item) => item.id !== session.id);
    }

    if (index !== -1) {
      const next = [...page];
      next[index] = session;
      changed = true;
      return next;
    }

    return page;
  });

  if (!shouldInclude) {
    return changed ? { ...data, pages } : data;
  }

  if (!existsInPages && pages.length > 0 && Array.isArray(pages[0])) {
    pages[0] = [session, ...pages[0]].sort(sortFn);
    changed = true;
  }

  if (pages.length > 0 && Array.isArray(pages[0]) && pages[0].length > PAGE_SIZE) {
    pages[0] = pages[0].slice(0, PAGE_SIZE);
    changed = true;
  }

  return changed ? { ...data, pages } : data;
};

const upsertSessionInCache = (
  data: TrainingSession[] | InfiniteData<TrainingSession[]> | undefined,
  session: TrainingSession,
  shouldInclude: boolean,
  sortFn: (a: TrainingSession, b: TrainingSession) => number
) => {
  if (!data) return data;

  if (Array.isArray(data)) {
    return upsertSessionInCollection(data, session, shouldInclude, sortFn);
  }

  if ('pages' in data && Array.isArray(data.pages)) {
    return upsertSessionInInfinite(data, session, shouldInclude, sortFn);
  }

  return data;
};

export function useChatMutations(conversationId: string | null) {
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptSessionMutation = useMutation({
    mutationFn: async (session: AIRecommendedSession) => {
      const recommendationText = session.description || '';
      const comments = recommendationText ? `Séance recommandée : ${recommendationText}` : '';

      const sessionType = session.session_type;
      const intervalDetails = session.interval_details || null;

      if (isFractionneType(sessionType) && (!intervalDetails?.steps || intervalDetails.steps.length === 0)) {
        throw new Error("Impossible d'ajouter la séance : L'IA n'a pas généré les étapes détaillées. Veuillez demander à l'IA de régénérer la séance.");
      }

      return await addPlannedSession({
        sessionType,
        targetDuration: session.duration_min,
        targetDistance: session.estimated_distance_km,
        targetPace: session.target_pace_min_km,
        targetHeartRateBpm: session.target_hr_bpm,
        targetRPE: session.target_rpe,
        intervalDetails,
        recommendationId: session.recommendation_id,
        comments,
      });
    },
    onMutate: async (session: AIRecommendedSession) => {
      setLoadingSessionId(session.recommendation_id ?? null);

      await queryClient.cancelQueries({ queryKey: queryKeys.sessionsHistory() });

      const previousSessions = queryClient.getQueryData<TrainingSession[]>(queryKeys.sessionsHistory());

      const optimisticSession: TrainingSession = {
        id: `optimistic-${session.recommendation_id}`,
        sessionNumber: 0,
        sessionType: session.session_type || 'Footing',
        status: 'planned',
        week: null,
        userId: '',
        date: null,
        duration: null,
        distance: null,
        avgPace: null,
        avgHeartRate: null,
        perceivedExertion: null,
        comments: session.description || '',
        intervalDetails: session.interval_details || null,
        plannedDate: null,
        targetPace: session.target_pace_min_km ?? null,
        targetDuration: session.duration_min ?? null,
        targetDistance: session.estimated_distance_km ?? null,
        targetHeartRateBpm: session.target_hr_bpm ?? null,
        targetRPE: session.target_rpe ?? null,
        recommendationId: session.recommendation_id ?? null,
        externalId: null,
        source: 'coach',
      };

      queryClient.setQueryData<TrainingSession[]>(queryKeys.sessionsHistory(), (old) =>
        old ? [optimisticSession, ...old] : [optimisticSession]
      );

      return { previousSessions };
    },
    onSuccess: (newSession, originalSession) => {
      if (newSession) {
        queryClient.setQueryData<TrainingSession[]>(queryKeys.sessionsHistory(), (old) => {
          if (!old) return [newSession];
          return old.map((s) =>
            s.id.startsWith('optimistic-') && s.recommendationId === originalSession.recommendation_id
              ? newSession
              : s
          );
        });

        const sessionQueries = queryClient.getQueriesData<TrainingSession[] | InfiniteData<TrainingSession[]>>({
          queryKey: queryKeys.sessions(),
        });

        for (const [queryKey, data] of sessionQueries) {
          if (!Array.isArray(queryKey) || queryKey[0] !== queryKeys.sessions()[0]) {
            continue;
          }

          const scope = queryKey[1];
          let shouldInclude = true;
          let sortFn = buildSortFn(undefined);

          if (scope === 'all') {
            const userId = queryKey[2] as string | null | undefined;
            shouldInclude = matchesSessionFilters(newSession, { userId });
          }

          if (scope === 'paginated') {
            const params = queryKey[2] as {
              selectedType?: string;
              search?: string;
              dateFrom?: string;
              userId?: string | null;
              sortKey?: string;
            };
            shouldInclude = matchesSessionFilters(newSession, params ?? {});
            sortFn = buildSortFn(params?.sortKey);
          }

          const nextData = upsertSessionInCache(data, newSession, shouldInclude, sortFn);
          if (nextData !== data) {
            queryClient.setQueryData(queryKey as QueryKey, nextData);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.sessionsHistory() });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
    },
    onError: (error, _session, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(queryKeys.sessionsHistory(), context.previousSessions);
      }

      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de la séance',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setLoadingSessionId(null);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string; recommendationId: string }) => {
      await deleteSession(sessionId);
    },
    onMutate: async ({ sessionId, recommendationId }) => {
      setLoadingSessionId(recommendationId);

      await queryClient.cancelQueries({ queryKey: queryKeys.sessionsHistory() });

      const previousSessions = queryClient.getQueryData<TrainingSession[]>(queryKeys.sessionsHistory());

      queryClient.setQueryData<TrainingSession[]>(queryKeys.sessionsHistory(), (old) =>
        old ? old.filter((s) => s.id !== sessionId && s.recommendationId !== recommendationId) : []
      );

      return { previousSessions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
    },
    onError: (error, _variables, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(queryKeys.sessionsHistory(), context.previousSessions);
      }

      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la suppression de la séance',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setLoadingSessionId(null);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error('Aucune conversation sélectionnée');
      return apiSendMessage(conversationId, content);
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.conversation(conversationId) });

      const previousConversation = queryClient.getQueryData(queryKeys.conversation(conversationId));

      queryClient.setQueryData(queryKeys.conversation(conversationId), (old: ConversationWithMessages | undefined) => {
        if (!old) return old;
        return {
          ...old,
          chat_messages: [
            ...old.chat_messages,
            {
              id: `temp-${crypto.randomUUID()}`,
              role: 'user',
              content,
              createdAt: new Date().toISOString(),
              recommendations: null,
            },
          ],
        };
      });

      return { previousConversation };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversation(conversationId), (old: ConversationWithMessages | undefined) => {
        if (!old) return old;

        const messagesWithoutTemp = old.chat_messages.filter((m) => !m.id.toString().startsWith('temp-'));

        return {
          ...old,
          chat_messages: [
            ...messagesWithoutTemp,
            data.userMessage,
            data.assistantMessage
          ],
        };
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    },
    onError: (error, _variables, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(queryKeys.conversation(conversationId), context.previousConversation);
      }
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'envoi du message',
        variant: 'destructive',
      });
    },
  });

  return {
    acceptSession: acceptSessionMutation.mutate,
    deleteSession: deleteSessionMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    isAccepting: acceptSessionMutation.isPending,
    isDeleting: deleteSessionMutation.isPending,
    isSending: sendMessageMutation.isPending,
    loadingSessionId,
  };
}
