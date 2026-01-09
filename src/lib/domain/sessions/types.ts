import type { IntervalDetails } from '@/lib/types/session';

/**
 * Normalized training session for AI processing.
 * 
 * This type represents a session with all fields normalized to consistent types
 * with sensible defaults (empty strings for text, 0 for numbers).
 * Used for building AI context and processing session data.
 */
export interface NormalizedSession {
  date: string;
  sessionType: string;
  avgPace: string;
  duration: string;
  comments: string;
  avgHeartRate: number;
  perceivedExertion: number;
  distance: number;
  week?: number | null;
  status?: string;
  sessionNumber?: number;
  intervalDetails?: IntervalDetails | null;
}
