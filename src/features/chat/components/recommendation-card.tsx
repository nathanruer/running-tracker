import { Check, Trash2, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AIRecommendedSession, TrainingSession } from '@/lib/types';
import { formatDurationChat } from '@/lib/utils/chat/formatters';

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
  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="font-semibold">
            Séance {displaySessionNumber}
          </Badge>
          <Badge variant="outline" className="font-medium">
            {(() => {
              const sessionType = session.session_type;
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
            onClick={() => onAccept(session)}
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
            Réalisée
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const sessionId = getAddedSessionId(session);
              if (sessionId && session.recommendation_id) {
                onDelete({ sessionId, recommendationId: session.recommendation_id });
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
          {formatDurationChat(session.duration_min)}
        </span>
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {session.target_pace_min_km} /km
        </span>
        <span>•</span>
        <span className="text-sm">
          FC: {session.target_hr_bpm || session.target_hr_zone}
          {session.target_hr_bpm && ' bpm'}
        </span>
        {session.target_rpe && (
          <span className="text-sm">
            RPE: {session.target_rpe}/10
          </span>
        )}
      </div>

      <p className="text-sm bg-muted/30 rounded px-3 py-2 border-l-2 border-primary">
        {session.why_this_session}
      </p>
    </div>
  );
}
