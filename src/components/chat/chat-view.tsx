'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircle, Check, Trash2, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSessions } from '@/lib/services/api-client';
import type { AIRecommendedSession } from '@/lib/types';

interface Recommendations {
  recommended_sessions?: AIRecommendedSession[];
  [key: string]: unknown;
}

interface Message {
  id: string;
  role: string;
  content: string;
  recommendations: Recommendations | null;
  model?: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  chat_messages: Message[];
}

interface ChatViewProps {
  conversationId: string | null;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const getNextSessionNumber = () => {
    if (allSessions.length === 0) return 1;
    return Math.max(...allSessions.map(s => s.sessionNumber)) + 1;
  };

  const [input, setInput] = useState('');
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions', 'history'],
    queryFn: () => getSessions(50, 0, 'all'),
    staleTime: 5 * 60 * 1000,
  });

  const isSessionAlreadyAdded = (recommendedSession: AIRecommendedSession) => {
    return allSessions.some(
      (s) => (s.status === 'planned' || s.status === 'completed') && s.recommendationId === recommendedSession.recommendation_id
    );
  };

  const isSessionCompleted = (recommendedSession: AIRecommendedSession) => {
    return allSessions.some(
      (s) => s.status === 'completed' && s.recommendationId === recommendedSession.recommendation_id
    );
  };

  const getAddedSessionId = (recommendedSession: AIRecommendedSession) => {
    const session = allSessions.find(
      (s) => s.status === 'planned' && s.recommendationId === recommendedSession.recommendation_id
    );
    return session?.id;
  };

  const getCompletedSession = (recommendedSession: AIRecommendedSession) => {
    return allSessions.find(
      (s) => s.status === 'completed' && s.recommendationId === recommendedSession.recommendation_id
    );
  };

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Erreur lors du chargement de la conversation');
      return response.json() as Promise<Conversation>;
    },
    enabled: !!conversationId,
    staleTime: 0,
    refetchOnMount: true,
  });

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
      setInput('');
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.chat_messages]);

  const handleSendMessage = () => {
    if (!input.trim() || !conversationId) return;
    sendMessageMutation.mutate(input.trim());
  };

  if (!conversationId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">Aucune conversation sélectionnée</h3>
          <p className="text-sm">Sélectionnez une conversation ou créez-en une nouvelle</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold truncate">{conversation?.title || 'Chargement...'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && !conversation && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {conversation?.chat_messages.map((message) => (
          <div key={message.id}>
            {message.role === 'user' && (
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            )}

            {message.role === 'assistant' && (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-4 border border-border/30">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {message.content}
                  </p>
                </div>

                {message.recommendations?.recommended_sessions && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {message.recommendations.recommended_sessions.length === 1
                        ? 'Séance recommandée :'
                        : `${message.recommendations.recommended_sessions.length} séances recommandées :`}
                    </p>
                    {message.recommendations.recommended_sessions.map((session: AIRecommendedSession, idx: number) => {
                      const isAdded = isSessionAlreadyAdded(session);
                      const isCompleted = isSessionCompleted(session);
                      const completedSession = isCompleted ? getCompletedSession(session) : null;

                      const notAddedSessionsBeforeThis = (message.recommendations?.recommended_sessions ?? [])
                        .slice(0, idx)
                        .filter((s) => !isSessionAlreadyAdded(s))
                        .length;
                      const dynamicSessionNumber = getNextSessionNumber() + notAddedSessionsBeforeThis;

                      const displaySessionNumber = isAdded
                        ? (completedSession?.sessionNumber || session.session_number || session.sessionNumber)
                        : dynamicSessionNumber;

                      return (
                      <div
                        key={idx}
                        className="bg-card rounded-lg p-4 border border-border space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default" className="font-semibold">
                              Séance {displaySessionNumber}
                            </Badge>
                            <Badge variant="outline" className="font-medium">
                              {(() => {
                                const sessionType = session.session_type || session.type;
                                if (sessionType === 'Fractionné' && session.interval_structure) {
                                  const intervalStr = typeof session.interval_structure === 'string'
                                    ? session.interval_structure
                                    : typeof session.interval_structure === 'object'
                                    ? JSON.stringify(session.interval_structure)
                                    : String(session.interval_structure);
                                  return `${sessionType}: ${intervalStr}`;
                                }
                                return sessionType;
                              })()}
                            </Badge>
                          </div>
                          {!isAdded ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => acceptSessionMutation.mutate(session)}
                              disabled={loadingSessionId === session.recommendation_id}
                              className="shrink-0"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Ajouter
                            </Button>
                          ) : isCompleted ? (
                            <Badge 
                              variant="secondary" 
                              className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Réalisé
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const sessionId = getAddedSessionId(session);
                                if (sessionId && session.recommendation_id) {
                                  deleteSessionMutation.mutate({
                                    sessionId,
                                    recommendationId: session.recommendation_id
                                  });
                                }
                              }}
                              disabled={loadingSessionId === session.recommendation_id}
                              className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap text-sm">
                          <span className="font-semibold">{session.estimated_distance_km} km</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.duration_minutes || session.duration_min)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {session.target_pace_min_km} /km
                          </span>
                          <span>•</span>
                          <span className="text-sm">
                            FC: {session.target_hr_bpm || session.target_hr_zone || session.target_hr}
                            {session.target_hr_bpm && ' bpm'}
                          </span>
                          {session.target_rpe && (
                            <span className="text-sm">
                              RPE: {session.target_rpe}/10
                            </span>
                          )}
                        </div>

                        <p className="text-sm bg-muted/30 rounded px-3 py-2 border-l-2 border-primary">
                          {session.why_this_session || session.reason}
                        </p>
                      </div>
                    )})}
                  </div>
                )}

                {message.model && (
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Réponse générée par {message.model}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {sendMessageMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted/50 rounded-lg p-4 border border-border/30">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Le coach analyse vos données...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Je voudrais 2 séances en plus pour cette semaine..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || !input.trim()}
            className="shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
