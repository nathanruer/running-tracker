import 'server-only';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export type AiProvider = 'google' | 'groq';

/** Chat model of each provider, and the lighter one used to summarise conversations. */
const MODELS: Record<AiProvider, { chat: string; summary: string }> = {
  google: { chat: 'gemini-3-flash-preview', summary: 'gemini-3.1-flash-lite' },
  groq: { chat: 'openai/gpt-oss-120b', summary: 'openai/gpt-oss-20b' },
};

export const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS ?? process.env.GROQ_MAX_TOKENS ?? 3000);
export const AI_TEMPERATURE = 0.7;

function hasKey(provider: AiProvider): boolean {
  return Boolean(provider === 'google' ? process.env.GOOGLE_GENERATIVE_AI_API_KEY : process.env.GROQ_API_KEY);
}

/** The provider answering the athlete: `AI_PROVIDER`, else whichever key is configured. */
export function primaryProvider(): AiProvider {
  const configured = process.env.AI_PROVIDER as AiProvider | undefined;
  if (configured === 'google' || configured === 'groq') return configured;
  return hasKey('google') ? 'google' : 'groq';
}

/** The other provider, used when the first one is rate limited. */
export function fallbackProvider(): AiProvider | null {
  const other: AiProvider = primaryProvider() === 'google' ? 'groq' : 'google';
  return hasKey(other) ? other : null;
}

let googleClient: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let groqClient: ReturnType<typeof createGroq> | null = null;

function client(provider: AiProvider) {
  if (provider === 'google') {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Clé API Google AI manquante');
    googleClient ??= createGoogleGenerativeAI({ apiKey });
    return googleClient;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Clé API Groq manquante');
  groqClient ??= createGroq({ apiKey });
  return groqClient;
}

export function modelName(provider: AiProvider, kind: 'chat' | 'summary' = 'chat'): string {
  const override = kind === 'chat' ? process.env.AI_MODEL : process.env.AI_SUMMARY_MODEL;
  return override || MODELS[provider][kind];
}

export function getModel(provider: AiProvider, kind: 'chat' | 'summary' = 'chat'): LanguageModel {
  return client(provider)(modelName(provider, kind));
}

/** Drops the memoised clients — used by the tests and after an environment change. */
export function resetAiProviders(): void {
  googleClient = null;
  groqClient = null;
}
