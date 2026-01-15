import { useMemo } from 'react';
import type { TrainingSession } from '@/lib/types';
import { calculateIntervalTotals, generateIntervalStructure } from '@/lib/utils/intervals';
import { normalizeDurationFormat, formatDuration } from '@/lib/utils/duration';
import { normalizePaceOrRange } from '@/lib/utils/pace';
import { formatHRDisplay } from '@/lib/utils/heart-rate';

export interface SessionRowDisplayData {
  isPlanned: boolean;
  hasIntervalDetails: boolean;
  duration: string;
  distance: string;
  distanceValue: number;
  pace: string;
  heartRate: string;
  rpe: number | null;
  rpeColor: string;
  workoutTypeLabel: string | null;
  intervalStructure: string | null;
  dateDisplay: string | null;
hasApprox: boolean;
}

/**
 * Hook to compute display data for a session row.
 * Unifies the logic for both completed and planned sessions.
 */
export function useSessionRowData(session: TrainingSession): SessionRowDisplayData {
  return useMemo(() => {
    const isPlanned = session.status === 'planned';
    const hasIntervalDetails = session.sessionType === 'Fractionné' && !!session.intervalDetails;
    
    const totals = hasIntervalDetails 
      ? calculateIntervalTotals(session.intervalDetails?.steps) 
      : null;
    
    let duration = '-';
    if (isPlanned) {
      const displayDuration = totals?.totalDurationMin && totals.totalDurationMin > 0
        ? totals.totalDurationMin
        : session.targetDuration || 0;
      if (displayDuration > 0) {
        duration = formatDuration(Math.round(displayDuration) * 60);
      }
    } else {
      duration = session.duration 
        ? (normalizeDurationFormat(session.duration) || session.duration) 
        : '-';
    }
    
    // Distance
    let distanceValue = 0;
    if (isPlanned) {
      distanceValue = totals?.totalDistanceKm && totals.totalDistanceKm > 0
        ? totals.totalDistanceKm
        : session.targetDistance || 0;
    } else {
      distanceValue = session.distance || 0;
    }
    const distance = distanceValue > 0 ? distanceValue.toFixed(2) : '-';
    
    let pace = '-';
    if (isPlanned) {
      const paceValue = normalizePaceOrRange(session.targetPace);
      const globalPace = totals?.avgPaceFormatted 
        ? totals.avgPaceFormatted
        : (paceValue || '-');
      pace = globalPace;
    } else {
      pace = session.avgPace || '-';
    }
    
    let heartRate = '-';
    if (isPlanned) {
      heartRate = formatHRDisplay(
        totals?.avgBpm ?? null,
        session.targetHeartRateBpm,
        { useApproximation: false, includeUnit: false }
      );
    } else {
      heartRate = session.avgHeartRate ? String(session.avgHeartRate) : '-';
    }
    
    const rpe = isPlanned ? (session.targetRPE ?? null) : (session.perceivedExertion ?? null);
    
    // RPE Color (only for completed sessions with actual data)
    let rpeColor = 'text-muted-foreground/50';
    if (!isPlanned && rpe) {
      if (rpe <= 3) rpeColor = 'text-emerald-500/90';
      else if (rpe <= 6) rpeColor = 'text-amber-500/90';
      else if (rpe <= 8) rpeColor = 'text-orange-500/90';
      else rpeColor = 'text-rose-500/90';
    }
    
    const workoutTypeLabel = session.intervalDetails?.workoutType || null;
    
    const intervalStructure = isPlanned && hasIntervalDetails && !workoutTypeLabel
      ? generateIntervalStructure(session.intervalDetails)
      : null;
    
    let dateDisplay: string | null = null;
    if (session.date) {
      dateDisplay = new Date(session.date)
        .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .replace(/\//g, '.');
    }
    
    return {
      isPlanned,
      hasIntervalDetails,
      duration,
      distance,
      distanceValue,
      pace,
      heartRate,
      rpe,
      rpeColor,
      workoutTypeLabel,
      intervalStructure,
      dateDisplay,
      hasApprox: isPlanned,
    };
  }, [session]);
}
