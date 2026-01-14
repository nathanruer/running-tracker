import { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  }, [messages, isSending]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scroll-smooth no-scrollbar">
      {messages.map((message) => (
        <div key={message.id} className={cn(
          "flex w-full gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
          message.role === 'user' ? "justify-end" : "justify-start"
        )}>
          {message.role !== 'user' && (
            <div className="flex-shrink-0 flex items-end mb-1">
              <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
            </div>
          )}

          <div className={cn(
            "flex flex-col max-w-[85%] md:max-w-[75%] space-y-2",
            message.role === 'user' ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "relative px-5 py-3.5 text-sm transition-all",
              message.role === 'user' 
                ? "bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-500/10" 
                : "bg-muted/50 border border-border/40 text-foreground rounded-2xl"
            )} data-testid={message.role === 'assistant' ? "assistant-message" : "user-message"}>
              <p className="leading-relaxed whitespace-pre-line font-medium opacity-95">
                {message.content}
              </p>
            </div>

            {message.role === 'assistant' && message.recommendations?.recommended_sessions && (
              <div className="w-full space-y-5 pt-3">
                <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-1">
                  <div className="h-px flex-1 bg-border/40" />
                  {message.recommendations.recommended_sessions.length === 1
                    ? '1 Recommandation du coach'
                    : `${message.recommendations.recommended_sessions.length} Recommandations du coach`}
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                
                <div className="space-y-4">
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
              </div>
            )}

            {message.role === 'assistant' && message.model && (
              <p className="text-[9px] text-muted-foreground/30 font-black uppercase tracking-[0.15em] px-2">
                Modèle: {message.model}
              </p>
            )}
          </div>

          {message.role === 'user' && (
            <div className="flex-shrink-0 flex items-end mb-1">
              <div className="h-8 w-8 rounded-full bg-muted border border-border/40 flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground/50" />
              </div>
            </div>
          )}
        </div>
      ))}

      {isSending && (
        <div className="flex gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid="chat-loading-indicator">
          <div className="flex-shrink-0 flex items-end">
            <div className="h-8 w-8 rounded-full bg-violet-600/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-violet-600 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col space-y-2 max-w-[85%] md:max-w-[75%]">
            <div className="bg-muted/50 border border-border/20 rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-600/30 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-600/30 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-600/30 animate-bounce" />
                </div>
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                  Le coach réfléchit...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
