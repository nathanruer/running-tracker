import { StatCard } from '@/components/ui/stat-card';
import { normalizeDurationFormat, formatDuration } from '@/lib/utils/duration';
import { calculateIntervalTotals } from '@/lib/utils/intervals';
import type { TrainingSession } from '@/lib/types';

interface SessionStatsGridProps {
  session: TrainingSession;
  isPlannedSession: boolean;
}

export function SessionStatsGrid({ session, isPlannedSession }: SessionStatsGridProps) {
  const totals = calculateIntervalTotals(session.intervalDetails?.steps);

  const displayDistance = session.distance
    ? session.distance
    : totals.totalDistanceKm > 0
    ? totals.totalDistanceKm
    : session.targetDistance || null;

  const displayDuration = session.duration
    ? session.duration
    : totals.totalDurationMin > 0
    ? formatDuration(totals.totalDurationMin * 60)
    : session.targetDuration
    ? formatDuration(session.targetDuration * 60)
    : null;

  const displayPace = session.avgPace
    ? session.avgPace
    : totals.avgPaceFormatted
    ? totals.avgPaceFormatted
    : session.targetPace || null;

  const displayHR = session.avgHeartRate
    ? session.avgHeartRate
    : totals.avgBpm
    ? totals.avgBpm
    : session.targetHeartRateBpm || null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {displayDistance !== null && (
        <StatCard
          label="Distance"
          value={session.distance ? displayDistance.toFixed(2) : `~${displayDistance.toFixed(2)}`}
          unit="km"
          highlight={!isPlannedSession}
        />
      )}
      {displayDuration !== null && (
        <StatCard
          label="Durée"
          value={
            session.duration
              ? normalizeDurationFormat(displayDuration) || displayDuration
              : `~${displayDuration}`
          }
          highlight={!isPlannedSession}
        />
      )}
      {displayPace !== null && (
        <StatCard
          label="Allure"
          value={session.avgPace ? displayPace : `~${displayPace}`}
          unit="min/km"
        />
      )}
      {displayHR !== null && (
        <StatCard
          label="FC moyenne"
          value={session.avgHeartRate ? displayHR : `~${displayHR}`}
          unit={displayHR && typeof displayHR === 'number' ? 'bpm' : undefined}
        />
      )}
      {(isPlannedSession ? session.targetRPE : session.perceivedExertion) && (
        <StatCard
          label={isPlannedSession ? 'RPE cible' : 'Effort (RPE)'}
          value={isPlannedSession ? session.targetRPE ?? '-' : session.perceivedExertion ?? '-'}
          unit="/10"
        />
      )}
    </div>
  );
}
