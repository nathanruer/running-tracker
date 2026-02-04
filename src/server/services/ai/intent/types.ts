import 'server-only';
export type Intent =
  | 'recommendation_request'
  | 'data_analysis'
  | 'advice'
  | 'education'
  | 'discussion'
  | 'greeting';

export type RequiredData = 'none' | 'profile' | 'recent' | 'stats' | 'full';

export interface IntentResult {
  intent: Intent;
  requiredData: RequiredData;
  confidence: number;
}

export const INTENT_DATA_MAP: Record<Intent, RequiredData> = {
  recommendation_request: 'full',
  data_analysis: 'stats',
  advice: 'recent',
  education: 'profile',
  discussion: 'profile',
  greeting: 'none',
};

export const VALID_INTENTS: Intent[] = [
  'recommendation_request',
  'data_analysis',
  'advice',
  'education',
  'discussion',
  'greeting',
];
