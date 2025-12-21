/**
 * Normalized training session for AI processing
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
  intervalDetails?: unknown;
  [key: string]: unknown;
}
