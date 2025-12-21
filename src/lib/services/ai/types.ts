export interface AIRecommendedSession {
  target_pace_min_km: string;
  duration_min: number;
  estimated_distance_km: number;
  recommendation_id?: string;
  [key: string]: unknown;
}

export interface AIRecommendationsResponse {
  responseType: 'recommendations';
  recommended_sessions: AIRecommendedSession[];
  week_summary?: string;
  rationale?: string;
  [key: string]: unknown;
}

export interface AIConversationResponse {
  responseType: 'conversation';
  message: string;
  [key: string]: unknown;
}

export type AIResponse = AIRecommendationsResponse | AIConversationResponse;
