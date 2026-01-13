import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { AIRecommendedSession, TrainingSession } from '@/lib/types';
import { RecommendationCard } from './recommendation-card';
import {
  isSessionAlreadyAdded,
  isSessionCompleted,
  getAddedSessionId,
  getCompletedSession,
  getNextSessionNumber,
} from '@/lib/domain/sessions/helpers';

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

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  loadingSessionId: string | null;
  allSessions: TrainingSession[];
  onAcceptSession: (session: AIRecommendedSession) => void;
  onDeleteSession: (params: { sessionId: string; recommendationId: string }) => void;
}

export function MessageList({
  messages,
  isSending,
  loadingSessionId,
  allSessions,
  onAcceptSession,
  onDeleteSession,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === 'user' && (
            <div className="flex justify-end" data-testid="user-message">
              <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          )}

          {message.role === 'assistant' && (
            <div className="space-y-3" data-testid="assistant-message">
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
                    const isAdded = isSessionAlreadyAdded(session, allSessions);
                    const isCompleted_ = isSessionCompleted(session, allSessions);
                    const completedSession = isCompleted_ ? getCompletedSession(session, allSessions) : null;

                    const notAddedSessionsBeforeThis = (message.recommendations?.recommended_sessions ?? [])
                      .slice(0, idx)
                      .filter((s) => !isSessionAlreadyAdded(s, allSessions))
                      .length;
                    const dynamicSessionNumber = getNextSessionNumber(allSessions) + notAddedSessionsBeforeThis;

                    const displaySessionNumber = isAdded
                      ? (completedSession?.sessionNumber || session.sessionNumber || dynamicSessionNumber)
                      : dynamicSessionNumber;

                    return (
                      <RecommendationCard
                        key={idx}
                        session={session}
                        displaySessionNumber={displaySessionNumber}
                        isAdded={isAdded}
                        isCompleted={isCompleted_}
                        completedSession={completedSession ?? null}
                        loadingSessionId={loadingSessionId}
                        onAccept={onAcceptSession}
                        onDelete={onDeleteSession}
                        getAddedSessionId={(s) => getAddedSessionId(s, allSessions)}
                      />
                    );
                  })}
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

      {isSending && (
        <div className="flex justify-start" data-testid="chat-loading-indicator">
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
  );
}
