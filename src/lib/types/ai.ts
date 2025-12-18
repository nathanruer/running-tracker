export interface Session {
  date: string;
  sessionType: string;
  avgPace: string;
  avgHeartRate: number;
  duration: string;
  distance: number;
  perceivedExertion?: number;
  comments?: string;
  intervalDetails?: unknown;
}

export interface AIRecommendedSession {
  recommendation_id?: string;
  session_type?: string;
  type?: string;
  duration_min: number;
  duration_minutes?: number;
  estimated_distance_km: number;
  target_pace_min_km?: string;
  target_hr_zone?: string;
  target_hr?: string;
  target_hr_bpm?: number;
  target_rpe?: number;
  interval_structure?: string | null;
  interval_details?: string | null;
  why_this_session?: string;
  reason?: string;
  session_number?: number;
  sessionNumber?: number;
}

export interface UserProfile {
  maxHeartRate?: number;
  vma?: number;
  age?: number;
  goal?: string;
}

export interface BuildContextParams {
  currentWeekSessions: Session[];
  allSessions: Session[];
  userProfile: UserProfile;
  nextSessionNumber?: number;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  recommendations?: unknown;
  createdAt: Date;
}
