import { Check, Trash2, Clock, Activity, MapPin, Heart, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AIRecommendedSession, TrainingSession } from '@/lib/types';
import { formatDurationChat } from '@/lib/utils/chat/formatters';
import { calculateIntervalTotals } from '@/lib/utils/intervals';

interface RecommendationCardProps {
  session: AIRecommendedSession;
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
        "relative bg-card/40 rounded-[2.5rem] p-6 md:p-8 border border-border/40 transition-all shadow-none",
        isCompleted && "bg-green-500/5 border-green-500/10"
      )} 
      data-testid="recommendation-card"
    >
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-col gap-2 flex-1">
            {sessionInfo.structure && sessionInfo.structure.toLowerCase() !== session.session_type?.toLowerCase() ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-violet-600 bg-violet-600/10 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
                    {session.session_type}
                  </span>
                  {isCompleted && (
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-green-500 bg-green-500/10 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
                      Réalisée
                    </span>
                  )}
                </div>
                <h4 className="text-xl md:text-2xl font-black text-foreground tracking-tighter leading-tight italic">
                  « {sessionInfo.structure} »
                </h4>
              </>
            ) : (
              <div className="flex flex-col gap-1.5 md:gap-2">
                <h4 className="text-2xl md:text-3xl font-black text-foreground tracking-tighter leading-none uppercase italic">
                  {session.session_type}
                </h4>
                {isCompleted && (
                  <div className="flex">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-green-500 bg-green-500/10 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
                      Réalisée
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            {!isAdded ? (
              <Button
                data-testid="recommendation-accept"
                onClick={() => onAccept(session)}
                disabled={loadingSessionId === session.recommendation_id}
                variant="action"
                className="rounded-full h-10 md:h-11 px-6 md:px-8 transition-all text-[11px] font-bold w-full sm:w-auto"
              >
                <Check className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            ) : isCompleted ? (
              <div className="h-10 w-10 md:h-11 md:w-11 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                <Check className="h-5 w-5 md:h-6 md:w-6" />
              </div>
            ) : (
              <Button
                data-testid="recommendation-delete"
                size="icon"
                variant="neutral"
                onClick={() => {
                  const sessionId = getAddedSessionId(session);
                  if (sessionId && session.recommendation_id) {
                    onDelete({ sessionId, recommendationId: session.recommendation_id });
                  }
                }}
                disabled={loadingSessionId === session.recommendation_id}
                className="h-10 w-10 md:h-11 md:w-11 rounded-full text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all border-none bg-transparent"
              >
                <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-10 gap-y-5 pt-5 border-t border-border/20">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-violet-500/50" />
            <span className="text-base font-black tracking-tight">{isCalculated && "~"}{displayDistance} km</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-violet-500/50" />
            <span className="text-base font-black tracking-tight">{formatDurationChat(displayDuration)}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-violet-500/50" />
            <span className="text-base font-black tracking-tight">{totals.avgPaceFormatted || session.target_pace_min_km || '-'} /km</span>
          </div>

          <div className="hidden sm:flex items-center gap-2.5">
            <Heart className="h-4 w-4 text-violet-500/50" />
            <span className="text-base font-black tracking-tight">{totals.avgBpm || session.target_hr_bpm || '-'} bpm</span>
          </div>

          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-violet-500/50" />
            <span className="text-base font-black tracking-tight">{session.target_rpe || '-'} /10</span>
          </div>
        </div>

        {session.description && (
          <p className="text-sm text-muted-foreground/50 leading-relaxed font-medium max-w-3xl">
            {session.description}
          </p>
        )}
      </div>
    </div>
  );
}
