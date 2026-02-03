export { buildContextMessage } from './context';
export { getOptimizedConversationHistory, OPTIMIZATION_CONFIG } from './optimizer';
export { extractJsonFromAI, parseAndValidateAIResponse, AIParseError } from './parser';
export {
  callGroq,
  callGroqText,
  streamGroq,
  collectStreamedResponse,
  resetGroqClient,
  GROQ_MODEL,
  GROQ_MAX_TOKENS,
  GROQ_TEMPERATURE,
} from './groq-client';
export { validateAndFixRecommendations, validateAIResponse, enrichRecommendations } from './validator';

export { classifyIntent, resetClassifierClient } from './intent';
export type { Intent, IntentResult, RequiredData } from './intent';
export { INTENT_DATA_MAP, VALID_INTENTS } from './intent';

export { fetchConditionalContext } from './data';
export type { FetchedContext } from './data';

export { buildDynamicPrompt, BASE_PERSONALITY, formatContextForIntent } from './prompts';
export type { BuiltPrompt } from './prompts';

export { processStreamingMessage, prepareStreamContext } from './stream-service';
export type { StreamContext, StreamResult } from './stream-service';
