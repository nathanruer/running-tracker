export interface IntervalStep {
  stepNumber: number;
  stepType: 'warmup' | 'effort' | 'recovery' | 'cooldown';
  duration: string | null;
  distance: number | null;
  pace: string | null;
  hr: number | null;
}

export interface IntervalDetails {
  workoutType: string | null;
  repetitionCount: number | null;
  effortDuration: string | null;
  recoveryDuration: string | null;
  effortDistance: number | null;
  recoveryDistance: number | null;

  targetEffortPace: string | null;
  targetEffortHR: number | null;
  targetRecoveryPace: string | null;

  actualEffortPace: string | null;
  actualEffortHR: number | null;
  actualRecoveryPace: string | null;

  steps: IntervalStep[];
}

export interface TrainingSession {
  id: string;
  sessionNumber: number;
  week: number | null;
  date: string | null;
  sessionType: string;
  duration: string | null;
  distance: number | null;
  avgPace: string | null;
  avgHeartRate: number | null;
  intervalDetails?: IntervalDetails | null;
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
