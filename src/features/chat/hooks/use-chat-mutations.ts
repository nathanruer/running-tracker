import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { AIRecommendedSession } from '@/lib/types';

interface Conversation {
  id: string;
  title: string;
  chat_messages: Message[];
}

interface Message {
  id: string;
  role: string;
  content: string;
  recommendations: unknown;
  model?: string;
  createdAt: string;
}

export function useChatMutations(conversationId: string | null) {
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptSessionMutation = useMutation({
    mutationFn: async (session: AIRecommendedSession) => {
      const recommendationText = session.why_this_session || session.reason || '';
      const comments = recommendationText ? `Séance recommandée : ${recommendationText}` : '';

      const response = await fetch('/api/sessions/planned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: session.session_type || session.type,
          targetDuration: session.duration_minutes || session.duration_min,
          targetDistance: session.estimated_distance_km,
          targetPace: session.target_pace_min_km,
          targetHeartRateZone: session.target_hr_zone || session.target_hr,
          targetHeartRateBpm: session.target_hr_bpm,
          targetRPE: session.target_rpe,
          intervalDetails: session.interval_details || null,
          recommendationId: session.recommendation_id,
          comments,
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'ajout de la séance');
      return response.json();
    },
    onMutate: (session: AIRecommendedSession) => {
      setLoadingSessionId(session.recommendation_id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({
        title: 'Séance ajoutée',
        description: 'La séance a été ajoutée à vos séances prévues',
      });
    },
    onError: (error) => {
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
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression de la séance');
      return response.json();
    },
    onMutate: ({ recommendationId }) => {
      setLoadingSessionId(recommendationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({
        title: 'Séance supprimée',
        description: 'La séance a été retirée de vos séances prévues',
      });
    },
    onError: (error) => {
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

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'envoi du message');
      return response.json();
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ['conversation', conversationId] });

      const previousConversation = queryClient.getQueryData(['conversation', conversationId]);

      queryClient.setQueryData(['conversation', conversationId], (old: Conversation | undefined) => {
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
      queryClient.setQueryData(['conversation', conversationId], (old: Conversation | undefined) => {
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
