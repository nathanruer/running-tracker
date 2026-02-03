import type { Intent } from '../intent/types';
import type { FetchedContext } from '../data/fetcher';
import {
  RECOMMENDATION_PROMPT,
  ANALYSIS_PROMPT,
  ADVICE_PROMPT,
  EDUCATION_PROMPT,
  DISCUSSION_PROMPT,
  GREETING_PROMPT,
} from './intents';
import { formatContextForIntent } from './context-formatter';

const INTENT_PROMPTS: Record<Intent, string> = {
  recommendation_request: RECOMMENDATION_PROMPT,
  data_analysis: ANALYSIS_PROMPT,
  advice: ADVICE_PROMPT,
  education: EDUCATION_PROMPT,
  discussion: DISCUSSION_PROMPT,
  greeting: GREETING_PROMPT,
};

export interface BuiltPrompt {
  systemPrompt: string;
  contextMessage: string | null;
  requiresJson: boolean;
}

export function buildDynamicPrompt(intent: Intent, context: FetchedContext): BuiltPrompt {
  const systemPrompt = INTENT_PROMPTS[intent];
  const contextMessage = formatContextForIntent(context, intent);
  const requiresJson = intent === 'recommendation_request';

  return {
    systemPrompt,
    contextMessage,
    requiresJson,
  };
}
