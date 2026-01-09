/**
 * Type for sessions parsed from CSV or other formats
 */
export interface ParsedSession {
  date: string;
  sessionType: string;
  duration: string;
  distance: number;
  avgPace: string;
  avgHeartRate: number;
  perceivedExertion?: number;
  comments: string;
  intervalDetails?: string | null;
}
