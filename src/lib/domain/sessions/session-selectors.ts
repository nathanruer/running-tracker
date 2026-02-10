import type { CompletedSession, PlannedSession, TrainingSession } from '@/lib/types';
import { parseDuration } from '@/lib/utils/duration/parse';

export type SessionDateInput = Pick<TrainingSession, 'status' | 'date' | 'plannedDate'>;
export type SessionDistanceInput = Pick<TrainingSession, 'status' | 'distance' | 'targetDistance'>;
export type SessionDurationInput = Pick<TrainingSession, 'status' | 'duration' | 'targetDuration'>;
export type SessionStatusInput = Pick<TrainingSession, 'status'>;

export function isPlanned(session: SessionStatusInput): session is PlannedSession {
  return session.status === 'planned';
}

export function isCompleted(session: SessionStatusInput): session is CompletedSession {
  return session.status === 'completed';
}

export function getSessionEffectiveDate(session: SessionDateInput): string | null {
  if (isPlanned(session)) {
    return session.plannedDate ?? session.date ?? null;
  }
  return session.date ?? null;
}

export function getSessionDistanceKm(session: SessionDistanceInput): number {
  if (isPlanned(session)) {
    return session.targetDistance ?? session.distance ?? 0;
  }
  return session.distance ?? 0;
}

export function getSessionDurationSeconds(session: SessionDurationInput): number {
  if (isPlanned(session)) {
    const minutes = session.targetDuration ?? 0;
    return minutes > 0 ? minutes * 60 : 0;
  }
  return parseDuration(session.duration) || 0;
}
