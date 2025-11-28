'use client';

import { useState } from 'react';
import { MessageCircle, Send, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { type TrainingSession, type User, getSessions } from '@/lib/api';
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

type MessageType = 'user' | 'assistant' | 'recommendations';

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

  // Récupérer tout l'historique pour l'analyse (jusqu'à 100 séances)
  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions', 'history'],
    queryFn: () => getSessions(100, 0, 'all'),
    staleTime: 5 * 60 * 1000, // Cache de 5 minutes
  });

  // Utiliser les sessions passées en props pour la semaine en cours (car elles sont à jour)
  // Mais utiliser allSessions pour l'historique complet
  const sessions = initialSessions.length > 0 ? initialSessions : allSessions;

  const getCurrentWeek = () => {
    if (sessions.length === 0) return 1;
    return Math.max(...sessions.map(s => s.week));
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
      // Extraction améliorée du nombre de séances (chiffres et texte)
      let remainingSessions = 2; // Valeur par défaut
      const lowerInput = input.toLowerCase();
      const numberMatch = lowerInput.match(/(\d+)/);
      
      if (numberMatch) {
        remainingSessions = parseInt(numberMatch[1]);
      } else if (lowerInput.includes('une') || lowerInput.includes('un')) {
        remainingSessions = 1;
      } else if (lowerInput.includes('deux')) {
        remainingSessions = 2;
      } else if (lowerInput.includes('trois')) {
        remainingSessions = 3;
      } else if (lowerInput.includes('quatre')) {
        remainingSessions = 4;
      } else if (lowerInput.includes('cinq')) {
        remainingSessions = 5;
      }

      const currentWeekSessions = getCurrentWeekSessions();
      // Prendre les 50 dernières séances de l'historique complet pour l'analyse de performance
      const recentSessions = allSessions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-50);

      const response = await fetch('/api/session-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedSessions: currentWeekSessions,
          recentSessions: recentSessions,
          remainingSessions,
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

      const recommendations: Recommendations = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'recommendations',
        content: recommendations.week_summary,
        recommendations,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
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
              <MessageCircle className="h-5 w-5 text-purple-500" />
              Coach IA - Recommandations de séances
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
        {/* Zone de messages */}
        {messages.length > 0 && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                )}

                {message.type === 'recommendations' && message.recommendations && (
                  <div className="space-y-3">
                    {/* Résumé */}
                    <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {message.recommendations.week_summary}
                        </p>
                      </div>
                    </div>

                    {/* Recommandations de séances */}
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
                                    • {session.target_pace_min_km}/km
                                  </span>
                                </div>

                                {session.interval_structure && (
                                  <Badge variant="secondary" className="text-xs">
                                    {session.interval_structure}
                                  </Badge>
                                )}

                                <p className="text-sm text-muted-foreground">
                                  {session.reason}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>FC cible: {session.target_hr} bpm</span>
                                  <span>Allure: {session.target_pace_min_km}/km</span>
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

        {/* Message initial si pas de messages */}
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-purple-500/50" />
            <p className="text-sm mb-4 max-w-md mx-auto">
              Demandez au coach de vous proposer des séances pour compléter votre semaine
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary" className="text-xs">
                Exemple: "Je voudrais 2 séances en plus"
              </Badge>
              <Badge variant="secondary" className="text-xs">
                "Propose-moi 3 séances pour cette semaine"
              </Badge>
            </div>
          </div>
        )}

        {/* Zone d'input */}
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

        <p className="text-xs text-muted-foreground text-center">
          Décrivez le nombre de séances souhaitées et le coach adaptera les recommandations
        </p>
      </CardContent>
    </Card>
  );
}
