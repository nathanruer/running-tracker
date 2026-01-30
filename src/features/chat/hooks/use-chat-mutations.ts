import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { AIRecommendedSession, TrainingSession } from '@/lib/types';
import {
  sendMessage as apiSendMessage,
  deleteSession,
  addPlannedSession,
  type ConversationWithMessages,
} from '@/lib/services/api-client';

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

      if (sessionType === 'Fractionné' && (!intervalDetails?.steps || intervalDetails.steps.length === 0)) {
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

      await queryClient.cancelQueries({ queryKey: ['sessions', 'history'] });

      const previousSessions = queryClient.getQueryData<TrainingSession[]>(['sessions', 'history']);

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

      queryClient.setQueryData<TrainingSession[]>(['sessions', 'history'], (old) =>
        old ? [optimisticSession, ...old] : [optimisticSession]
      );

      return { previousSessions };
    },
    onSuccess: (newSession, originalSession) => {
      if (newSession) {
        queryClient.setQueryData<TrainingSession[]>(['sessions', 'history'], (old) => {
          if (!old) return [newSession];
          return old.map((s) =>
            s.id.startsWith('optimistic-') && s.recommendationId === originalSession.recommendation_id
              ? newSession
              : s
          );
        });
      }

      queryClient.invalidateQueries({ queryKey: ['sessions', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (error, _session, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(['sessions', 'history'], context.previousSessions);
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

      await queryClient.cancelQueries({ queryKey: ['sessions', 'history'] });

      const previousSessions = queryClient.getQueryData<TrainingSession[]>(['sessions', 'history']);

      queryClient.setQueryData<TrainingSession[]>(['sessions', 'history'], (old) =>
        old ? old.filter((s) => s.id !== sessionId && s.recommendationId !== recommendationId) : []
      );

      return { previousSessions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (error, _variables, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(['sessions', 'history'], context.previousSessions);
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
      await queryClient.cancelQueries({ queryKey: ['conversation', conversationId] });

      const previousConversation = queryClient.getQueryData(['conversation', conversationId]);

      queryClient.setQueryData(['conversation', conversationId], (old: ConversationWithMessages | undefined) => {
        if (!old) return old;
        return {
          ...old,
          chat_messages: [
            ...old.chat_messages,
            {
              id: 'temp-' + Date.now(),
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
      queryClient.setQueryData(['conversation', conversationId], (old: ConversationWithMessages | undefined) => {
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

      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error, _variables, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(['conversation', conversationId], context.previousConversation);
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
