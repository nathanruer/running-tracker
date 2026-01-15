import { Check, Trash2, Clock, Activity, MapPin, Heart, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AIRecommendedSession, TrainingSession } from '@/lib/types';
import { formatDurationChat } from '@/lib/utils/chat/formatters';
import { calculateIntervalTotals } from '@/lib/utils/intervals';

interface RecommendationCardProps {
  session: AIRecommendedSession;
  displaySessionNumber: number;
  isAdded: boolean;
  isCompleted: boolean;
  completedSession: TrainingSession | null;
  loadingSessionId: string | null;
  onAccept: (session: AIRecommendedSession) => void;
  onDelete: (params: { sessionId: string; recommendationId: string }) => void;
  getAddedSessionId: (session: AIRecommendedSession) => string | undefined;
}

export function RecommendationCard({
  session,
  displaySessionNumber,
  isAdded,
  isCompleted,
  loadingSessionId,
  onAccept,
  onDelete,
  getAddedSessionId,
}: RecommendationCardProps) {
  const totals = calculateIntervalTotals(session.interval_details?.steps);
  
  const displayDistance = totals.totalDistanceKm > 0 ? totals.totalDistanceKm : session.estimated_distance_km;
  const displayDuration = totals.totalDurationMin > 0 ? totals.totalDurationMin : session.duration_min;
  const isCalculated = totals.totalDistanceKm > 0 || totals.totalDurationMin > 0;

  const sessionInfo = (() => {
    const sessionType = session.session_type;
    let structure = '';
    let technicalTargets = '';

    if (sessionType === 'Fractionné' && session.interval_structure) {
      structure = typeof session.interval_structure === 'string'
        ? session.interval_structure
        : typeof session.interval_structure === 'object'
        ? JSON.stringify(session.interval_structure)
        : String(session.interval_structure);
      
      const parts: string[] = [];
      const paceDisplay = session.target_pace_min_km;
      const hrDisplay = session.target_hr_bpm ? String(session.target_hr_bpm) : null;
      
      if (paceDisplay) parts.push(`${paceDisplay} /km`);
      if (hrDisplay) parts.push(`${hrDisplay} bpm`);
      
      if (parts.length > 0) {
        technicalTargets = `Cible : ${parts.join(' | ')}`;
      }
    }

    return { structure, technicalTargets };
  })();

  return (
    <div 
      className={cn(
        "relative bg-card rounded-2xl p-5 border border-border/40 transition-all",
        isCompleted && "bg-green-500/5 border-green-500/10"
      )} 
      data-testid="recommendation-card"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-600 bg-violet-500/10 px-2 py-0.5 rounded-md">
                Séance {displaySessionNumber}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40 border border-border/40 px-2 py-0.5 rounded-md">
                {session.session_type}
              </span>
              {isCompleted && (
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md">
                  Réalisée
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <h4 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                {sessionInfo.structure || session.session_type}
              </h4>
              {sessionInfo.technicalTargets && (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">
                  {sessionInfo.technicalTargets}
                </p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            {!isAdded ? (
              <Button
                data-testid="recommendation-accept"
                size="sm"
                onClick={() => onAccept(session)}
                disabled={loadingSessionId === session.recommendation_id}
                className="bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl h-10 px-5 text-xs tracking-tight active:scale-95 transition-all"
              >
                <Check className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            ) : isCompleted ? (
              <div className="h-10 w-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                <Check className="h-5 w-5" />
              </div>
            ) : (
              <Button
                data-testid="recommendation-delete"
                size="icon"
                variant="ghost"
                onClick={() => {
                  const sessionId = getAddedSessionId(session);
                  if (sessionId && session.recommendation_id) {
                    onDelete({ sessionId, recommendationId: session.recommendation_id });
                  }
                }}
                disabled={loadingSessionId === session.recommendation_id}
                className="h-10 w-10 rounded-2xl text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Distance</span>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span>{isCalculated && "~"}{displayDistance} km</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Durée</span>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span>{isCalculated && "~"}{formatDurationChat(displayDuration)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Allure</span>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <Activity className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span>{totals.avgPaceFormatted || session.target_pace_min_km || '-'} /km</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Pulsations</span>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <Heart className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span>{totals.avgBpm || session.target_hr_bpm || '-'} bpm</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Effort (RPE)</span>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span>{session.target_rpe || '-'}/10</span>
            </div>
          </div>
        </div>

        {session.description && (
          <div className="pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground/70 leading-relaxed italic">
              « {session.description} »
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
