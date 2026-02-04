import 'server-only';
import type { Session, IntervalDetails } from '@/lib/types';
import { generateIntervalStructure } from '@/lib/utils/intervals';
import { normalizePaceFormat } from '@/lib/utils/pace';
import { sanitizeForPrompt } from '@/lib/utils/sanitize';

function isIntervalDetails(value: unknown): value is IntervalDetails {
  return typeof value === 'object' && value !== null;
}

function normalizePace(pace?: string): string {
  if (!pace || typeof pace !== 'string') return '00:00';
  return normalizePaceFormat(pace) ?? '00:00';
}

export interface SessionData {
  date: string | null;
  type: string;
  duration: string | null;
  distance: number;
  avgPace: string;
  avgHeartRate: number;
  perceivedExertion: number | null;
  comments: string;
  intervalDetails: IntervalDetails | null;
}

export function getSessionData(s: Session): SessionData {
  return {
    date: s.date,
    type: sanitizeForPrompt(s.sessionType, 50),
    duration: s.duration,
    distance: s.distance,
    avgPace: normalizePace(s.avgPace),
    avgHeartRate: s.avgHeartRate,
    perceivedExertion: s.perceivedExertion,
    comments: sanitizeForPrompt(s.comments, 200),
    intervalDetails: s.intervalDetails ?? null,
  };
}

export function buildCurrentWeekContext(sessions: Session[]): string {
  if (!sessions || sessions.length === 0) {
    return ' Séances de la semaine en cours : Aucune séance cette semaine\n';
  }

  let context = ' Séances de la semaine en cours :\n';

  sessions.forEach((s, index) => {
    const sessionData = getSessionData(s);
    context += `${index + 1}. ${sessionData.date} - ${sessionData.type}\n`;
    context += `Durée: ${sessionData.duration}, Distance: ${sessionData.distance}km, Allure: ${sessionData.avgPace}/km\n`;

    if (sessionData.avgHeartRate > 0) {
      context += `FC moyenne: ${sessionData.avgHeartRate} bpm\n`;
    }
    if (sessionData.perceivedExertion && sessionData.perceivedExertion > 0) {
      context += `RPE: ${sessionData.perceivedExertion}/10\n`;
    }
    if (sessionData.intervalDetails && isIntervalDetails(sessionData.intervalDetails)) {
      const structure = generateIntervalStructure(sessionData.intervalDetails);
      if (structure) context += `Structure: ${structure}\n`;
    }
    if (sessionData.comments && sessionData.comments.trim()) {
      context += `Sensations: ${sessionData.comments}\n`;
    }
  });

  return context;
}

export function buildRecentSessionsContext(sessions: Session[], count: number = 3): string {
  if (!sessions || sessions.length === 0) {
    return '';
  }

  const numberOfDetailedSessions = Math.min(count, sessions.length);
  let context = `\n3 Dernières séances (détail) :\n`;
  const recentSessions = sessions.slice(0, numberOfDetailedSessions);

  recentSessions.forEach((s, index) => {
    const sessionData = getSessionData(s);
    context += `${index + 1}. ${sessionData.date} - ${sessionData.type}\n`;
    context += `   ${sessionData.duration}, ${sessionData.distance}km @ ${sessionData.avgPace}/km, FC ${sessionData.avgHeartRate}`;

    if (sessionData.intervalDetails && isIntervalDetails(sessionData.intervalDetails)) {
      const st = generateIntervalStructure(sessionData.intervalDetails);
      if (st) context += `, Structure: ${st}`;
    }
    context += '\n';
  });

  return context;
}
