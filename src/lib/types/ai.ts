import type { IntervalDetails } from './session';
import type { NormalizedSession } from '@/lib/domain/sessions/types';

/**
 * Session type for AI context building.
 * Alias to NormalizedSession for backward compatibility.
 * @see NormalizedSession
 */
export type Session = NormalizedSession;

/**
 * AI-generated session recommendation.
 *
 * This type represents a training session recommended by the AI coach.
 */
export interface AIRecommendedSession {
  recommendation_id?: string;
  session_type?: string;
  duration_min: number;
  estimated_distance_km: number;
  target_pace_min_km?: string;
  target_hr_bpm?: number;
  description?: string;
  target_rpe?: number;
  interval_structure?: string | null;
  interval_details?: IntervalDetails | null;
  sessionNumber?: number;
}

/**
 * User profile data for AI context
 */
export interface UserProfile {
  maxHeartRate?: number;
  vma?: number;
  age?: number;
  goal?: string;
}

/**
 * Parameters for building AI context message
 */
export interface BuildContextParams {
  currentWeekSessions: Session[];
  allSessions: Session[];
  userProfile: UserProfile;
  nextSessionNumber?: number;
}

/**
 * Chat message from conversation history
 */
export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  recommendations?: AIRecommendedSession[] | null;
  createdAt: Date;
}

/**
 * AI response with training recommendations
 */
export interface AIRecommendationsResponse {
  responseType: 'recommendations';
  recommended_sessions: AIRecommendedSession[];
  week_summary?: string;
  rationale?: string;
  [key: string]: unknown;
}

/**
 * AI conversational response (no recommendations)
 */
export interface AIConversationResponse {
  responseType: 'conversation';
  message: string;
  [key: string]: unknown;
}

/**
 * Union type for all AI response formats
 */
export type AIResponse = AIRecommendationsResponse | AIConversationResponse;
