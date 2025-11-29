export interface TrainingSession {
  id: string;
  sessionNumber: number;
  week: number;
  date: string | null;
  sessionType: string;
  duration: string | null;
  distance: number | null;
  avgPace: string | null;
  avgHeartRate: number | null;
  intervalStructure?: string | null;
  perceivedExertion?: number | null;
  comments: string;
  userId: string;
  status: string;
  plannedDate?: string | null;
  targetPace?: string | null;
  targetDuration?: number | null;
  targetDistance?: number | null;
  targetHeartRateZone?: string | null;
  targetHeartRateBpm?: string | null;
  targetRPE?: number | null;
  recommendationId?: string | null;
}

export type TrainingSessionPayload = Omit<
  TrainingSession,
  'id' | 'userId' | 'sessionNumber' | 'week' | 'status' | 'plannedDate' | 'targetPace' | 'targetDuration' | 'targetDistance' | 'targetHeartRateZone' | 'targetRPE'
>;
