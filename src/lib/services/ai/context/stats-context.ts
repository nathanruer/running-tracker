import type { Session, IntervalDetails } from '@/lib/types';
import { generateIntervalStructure, getEffortPace } from '@/lib/utils/intervals';
import { parseDuration, formatDuration } from '@/lib/utils/duration';
import { getSessionData } from './session-context';
import {
  isQualitySessionType,
  normalizeWorkoutType,
  WORKOUT_TYPES,
  type WorkoutType,
} from '@/lib/utils/session-type';
import { sanitizeForPrompt } from '@/lib/utils/sanitize';

function isIntervalDetails(value: unknown): value is IntervalDetails {
  return typeof value === 'object' && value !== null;
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeeksAgo(isoDate: string): number {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

function getCompactStructure(details: IntervalDetails | null | undefined): string {
  if (!details) return '';
  const { repetitionCount, effortDuration } = details;
  if (!repetitionCount || !effortDuration) return '';
  return `${repetitionCount}x${effortDuration}`;
}

interface WorkoutTypeStats {
  count: number;
  lastDate: string | null;
  lastStructure: string | null;
}

/**
 * Builds a compact distribution summary of workout types over a time window.
 * Shows count and last occurrence for each type (VMA, TEMPO, SEUIL, SPÉCIFIQUE).
 */
export function buildWorkoutTypeDistribution(sessions: Session[], weeksBack: number = 4): string {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - weeksBack * 7);

  const typeStats: Record<WorkoutType, WorkoutTypeStats> = {
    VMA: { count: 0, lastDate: null, lastStructure: null },
    TEMPO: { count: 0, lastDate: null, lastStructure: null },
    SEUIL: { count: 0, lastDate: null, lastStructure: null },
    SPÉCIFIQUE: { count: 0, lastDate: null, lastStructure: null },
  };

  const allQualitySessions = sessions.filter(
    s => isQualitySessionType(s.sessionType) && s.date
  );

  for (const session of allQualitySessions) {
    const workoutType = normalizeWorkoutType(
      isIntervalDetails(session.intervalDetails) ? session.intervalDetails.workoutType : null
    );
    if (workoutType && typeStats[workoutType]) {
      const sessionDate = new Date(session.date);
      if (sessionDate >= cutoffDate) {
        typeStats[workoutType].count++;
      }
      const lastDate = typeStats[workoutType].lastDate;
      if (!lastDate || sessionDate > new Date(lastDate)) {
        typeStats[workoutType].lastDate = session.date;
        typeStats[workoutType].lastStructure = isIntervalDetails(session.intervalDetails)
          ? getCompactStructure(session.intervalDetails)
          : null;
      }
    }
  }

  let output = `Distribution qualité (${weeksBack} sem):\n`;
  for (const type of WORKOUT_TYPES) {
    const stats = typeStats[type];
    let lastInfo = 'jamais';
    if (stats.lastDate) {
      const weeksAgo = getWeeksAgo(stats.lastDate);
      const agoStr = weeksAgo === 0 ? 'cette sem' : `il y a ${weeksAgo} sem`;
      lastInfo = `dernière: ${formatShortDate(stats.lastDate)} (${agoStr})${stats.lastStructure ? `, ${stats.lastStructure}` : ''}`;
    }
    output += `- ${type}: ${stats.count} séance${stats.count !== 1 ? 's' : ''} (${lastInfo})\n`;
  }

  return output;
}

/**
 * Builds a compact one-line-per-session history of quality sessions.
 */
export function buildCompactQualityHistory(sessions: Session[], count: number = 5): string {
  const qualitySessions = sessions.filter(s => isQualitySessionType(s.sessionType)).slice(0, count);

  if (qualitySessions.length === 0) return '';

  let output = 'Historique qualité récent:\n';
  for (const s of qualitySessions) {
    const date = s.date ? formatShortDate(s.date) : '??-??';
    const workoutType =
      isIntervalDetails(s.intervalDetails) && s.intervalDetails.workoutType
        ? s.intervalDetails.workoutType.toUpperCase()
        : 'FRAC';
    const structure = isIntervalDetails(s.intervalDetails)
      ? getCompactStructure(s.intervalDetails)
      : '';
    const pace = isIntervalDetails(s.intervalDetails) ? getEffortPace(s.intervalDetails) : null;

    output += `- ${date}: ${workoutType}`;
    if (structure) output += ` ${structure}`;
    if (pace) output += ` @ ${pace}/km`;
    output += '\n';
  }

  return output;
}

/**
 * Builds endurance-only stats (excludes quality sessions).
 */
export function buildEnduranceStats(sessions: Session[]): string {
  const sessionsByType: Record<string, Session[]> = {};

  sessions.forEach(s => {
    const type = s.sessionType || 'Autre';
    if (!isQualitySessionType(type)) {
      if (!sessionsByType[type]) sessionsByType[type] = [];
      sessionsByType[type].push(s);
    }
  });

  const lines = Object.entries(sessionsByType)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([type, typeSessions]) => {
      const recent = typeSessions.slice(0, 10);
      if (recent.length === 0) return null;

      const count = recent.length;
      const totalDist = recent.reduce((sum, s) => sum + s.distance, 0);
      const avgDist = totalDist / count;

      const totalDurationSec = recent.reduce((sum, s) => sum + (parseDuration(s.duration) || 0), 0);

      let avgPaceStr = '00:00';
      if (totalDist > 0 && totalDurationSec > 0) {
        const paceSec = totalDurationSec / totalDist;
        avgPaceStr = formatDuration(paceSec);
      }

      return `- ${type}: ${count}x moy. ${avgDist.toFixed(1)}km @ ${avgPaceStr}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return '';

  return 'Stats endurance:\n' + lines.join('\n') + '\n';
}

export function calculateSessionTypeStats(sessions: Session[]): string {
  const sessionsByType: Record<string, Session[]> = {};
  const sessionsWithIntervals: Session[] = [];

  sessions.forEach(s => {
    const type = s.sessionType || 'Autre';
    if (isQualitySessionType(type)) {
      sessionsWithIntervals.push(s);
    } else {
      if (!sessionsByType[type]) sessionsByType[type] = [];
      sessionsByType[type].push(s);
    }
  });

  let stats = '';

  let hasStandardStats = false;
  const standardStatsStr = Object.entries(sessionsByType)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([type, typeSessions]) => {
      const recent = typeSessions.slice(0, 10);
      if (recent.length === 0) return null;
      hasStandardStats = true;

      const count = recent.length;
      const totalDist = recent.reduce((sum, s) => sum + s.distance, 0);
      const avgDist = totalDist / count;

      const totalDurationSec = recent.reduce((sum, s) => sum + (parseDuration(s.duration) || 0), 0);
      const avgDurationSec = totalDurationSec / count;

      let avgPaceStr = '00:00';
      if (totalDist > 0 && totalDurationSec > 0) {
        const paceSec = totalDurationSec / totalDist;
        avgPaceStr = formatDuration(paceSec);
      }

      const sessionsWithHR = recent.filter(s => s.avgHeartRate > 0);
      const avgHR =
        sessionsWithHR.length > 0
          ? sessionsWithHR.reduce((sum, s) => sum + s.avgHeartRate, 0) / sessionsWithHR.length
          : 0;

      let line = `- ${type} (${count} dern.): moy. ${avgDist.toFixed(1)}km, ${formatDuration(avgDurationSec)}, ${avgPaceStr}/km`;
      if (avgHR > 0) line += `, FC ${Math.round(avgHR)}`;
      return line;
    })
    .filter(Boolean)
    .join('\n');

  if (hasStandardStats) {
    stats += 'Statistiques (Endurance/Standard) :\n' + standardStatsStr + '\n';
  }

  if (sessionsWithIntervals.length > 0) {
    stats += '\n** Dernières séances de qualité (Fractionné/VMA) :**\n';
    const recentIntervals = sessionsWithIntervals.slice(0, 10);

    recentIntervals.forEach(s => {
      const d = getSessionData(s);
      let structure = '';
      let effortPace = '';

      if (d.intervalDetails && isIntervalDetails(d.intervalDetails)) {
        structure = generateIntervalStructure(d.intervalDetails) || '';
        const pace = getEffortPace(d.intervalDetails);
        if (pace) effortPace = ` @ ${pace}/km (efforts)`;
      }

      stats += `- ${d.date} (${d.type}): ${d.distance}km (Moy. ${d.avgPace})`;
      if (structure) stats += `\n  Structure: ${structure}${effortPace}`;
      if (d.comments) stats += `\n  Note: ${sanitizeForPrompt(d.comments, 100).replace(/\n/g, ' ')}`;
      stats += '\n';
    });
  }

  return stats;
}

export function buildHistoryContext(sessions: Session[]): string {
  if (!sessions || sessions.length === 0) {
    return 'Historique : Aucune séance enregistrée\n';
  }

  let context = 'Historique global :\n';

  const totalSessions = sessions.length;
  const totalDistance = sessions.reduce((sum, s) => sum + s.distance, 0);

  context += `- ${totalSessions} séances totales, ${totalDistance.toFixed(1)} km au total.\n`;
  context += '\n' + calculateSessionTypeStats(sessions);

  return context;
}
