'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { type TrainingSession, type User } from '@/lib/types';
import { getSessions } from '@/lib/services/api-client';
import { useQuery } from '@tanstack/react-query';

interface SessionChatProps {
  sessions: TrainingSession[];
  user: User | undefined;
}

interface RecommendedSession {
  type: string;
  duration_min: number;
  target_pace_min_km: string;
  target_hr: string;
  estimated_distance_km: number;
  interval_structure?: string;
  reason: string;
}

interface Recommendations {
  recommended_sessions: RecommendedSession[];
  week_summary: string;
}

type MessageType = 'user' | 'assistant' | 'recommendations' | 'analysis';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  recommendations?: Recommendations;
  timestamp: Date;
}

export function SessionChat({ sessions: initialSessions, user }: SessionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions', 'history'],
    queryFn: () => getSessions(20, 0, 'all'),
    staleTime: 5 * 60 * 1000,
  });

  const sessions = initialSessions.length > 0 ? initialSessions : allSessions;

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const getCurrentWeek = () => {
    if (sessions.length === 0) return 1;
    const validWeeks = sessions.filter(s => s.week !== null).map(s => s.week as number);
    if (validWeeks.length === 0) return 1;
    return Math.max(...validWeeks);
  };

  const getCurrentWeekSessions = () => {
    const currentWeek = getCurrentWeek();
    return sessions.filter(s => s.week === currentWeek);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = [
        ...messages.slice(-5).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.type === 'recommendations' && msg.recommendations
            ? msg.recommendations.week_summary
            : msg.content
        })),
        {
          role: 'user',
          content: userMessage.content
        }
      ];

      const currentWeekSessions = getCurrentWeekSessions();

      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationHistory,
          currentWeekSessions: currentWeekSessions.map(s => ({
            sessionType: s.sessionType,
            duration: s.duration,
            distance: s.distance,
            avgPace: s.avgPace,
            avgHeartRate: s.avgHeartRate,
            date: s.date,
          })),
          allSessions: allSessions.map(s => ({
            sessionType: s.sessionType,
            duration: s.duration,
            distance: s.distance,
            avgPace: s.avgPace,
            avgHeartRate: s.avgHeartRate,
            date: s.date,
          })),
          userProfile: {
            maxHeartRate: user?.maxHeartRate,
            vma: user?.vma,
            age: user?.age,
            weight: user?.weight,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération');
      }

      const data = await response.json();

      if (data.responseType === 'conversation') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (data.responseType === 'recommendations') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'recommendations',
          content: data.week_summary,
          recommendations: {
            recommended_sessions: data.recommended_sessions,
            week_summary: data.week_summary
          },
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (data.responseType === 'analysis') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'analysis',
          content: data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la génération',
        variant: 'destructive',
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const currentWeek = getCurrentWeek();
  const currentWeekSessions = getCurrentWeekSessions();

  return (
    <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Bob - ton oach IA de course à pied
            </CardTitle>
            <CardDescription>
              Demandez des recommandations personnalisées pour compléter votre semaine
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            Semaine {currentWeek} • {currentWeekSessions.length} séance(s) réalisée(s)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {messages.length > 0 && (
          <div ref={messagesContainerRef} className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {messages.map((message) => (
              <div key={message.id}>
                {message.type === 'user' && (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                )}

                {message.type === 'assistant' && (
                  <div className="space-y-3">
                    <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}

                {message.type === 'analysis' && (
                  <div className="bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-pink-500/5 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                        <span className="text-white text-sm font-bold">📊</span>
                      </div>
                      <h4 className="font-semibold text-purple-700 dark:text-purple-300">
                        Analyse de progression
                      </h4>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}

                {message.type === 'recommendations' && message.recommendations && (
                  <div className="space-y-3">
                    <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {message.recommendations.week_summary}
                        </p>
                      </div>
                    </div>

                    {message.recommendations.recommended_sessions.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          Séances recommandées :
                        </p>
                        {message.recommendations.recommended_sessions.map((session, idx) => (
                          <div
                            key={idx}
                            className="bg-background rounded-lg p-4 border border-border/30 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline">{session.type}</Badge>
                                  <span className="font-medium">{session.estimated_distance_km} km</span>
                                  <span className="text-sm text-muted-foreground">
                                    • {session.duration_min} min
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    • {session.target_pace_min_km} min/km
                                  </span>
                                </div>

                                {session.interval_structure && (() => {
                                  const parts = session.interval_structure.split(':');
                                  if (parts.length === 2) {
                                    const subtype = parts[0].trim();
                                    const structure = parts[1].trim();
                                    return (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="default" className="text-xs font-semibold">
                                          {subtype}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                          {structure}
                                        </Badge>
                                      </div>
                                    );
                                  }
                                  return (
                                    <Badge variant="secondary" className="text-xs">
                                      {session.interval_structure}
                                    </Badge>
                                  );
                                })()}

                                <p className="text-sm text-muted-foreground">
                                  {session.reason}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>FC cible: {session.target_hr} bpm</span>
                                  <span>Allure: {session.target_pace_min_km} min/km</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm">Le coach analyse vos données...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-purple-500/50" />
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-border/50">
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
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
