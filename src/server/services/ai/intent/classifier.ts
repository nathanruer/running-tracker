import 'server-only';
import Groq from 'groq-sdk';
import { Intent, IntentResult, INTENT_DATA_MAP, VALID_INTENTS } from './types';
import { withRetry } from '@/lib/utils/retry';
import { getHttpStatus } from '@/lib/utils/error';

const CLASSIFIER_MODEL = 'llama-3.1-8b-instant';

const CLASSIFIER_PROMPT = `Tu es un classificateur d'intentions pour un coach de running. Analyse le message et retourne JSON.

INTENTIONS POSSIBLES:
- recommendation_request: Demande de seance, programme, planning, entrainement
- data_analysis: Question sur les donnees, stats, progression, evolution, performances
- advice: Demande d'avis, conseil, feedback sur l'entrainement
- education: Question technique sur le running, physiologie, zones cardiaques
- discussion: Discussion libre, ressenti, blessure, fatigue, objectifs personnels
- greeting: Salutation simple (bonjour, merci, au revoir)

Reponds UNIQUEMENT avec ce JSON:
{"intent": "...", "confidence": 0.0-1.0}`;

let classifierClient: Groq | null = null;

function getClassifierClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Clé API Groq manquante');
  }
  if (!classifierClient) {
    classifierClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return classifierClient;
}

export function resetClassifierClient(): void {
  classifierClient = null;
}

function isValidIntent(value: string): value is Intent {
  return VALID_INTENTS.includes(value as Intent);
}

export async function classifyIntent(message: string): Promise<IntentResult> {
  const client = getClassifierClient();

  const completion = await withRetry(
    () =>
      client.chat.completions.create({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: 'system', content: CLASSIFIER_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
        max_tokens: 50,
        response_format: { type: 'json_object' },
      }),
    {
      maxAttempts: 3,
      shouldRetry: (err) => getHttpStatus(err) !== 429,
    }
  );

  const content = completion.choices[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content) as { intent?: string; confidence?: number };
    const intent: Intent = isValidIntent(parsed.intent ?? '') ? parsed.intent as Intent : 'discussion';
    const confidence =
      typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5;

    return {
      intent,
      requiredData: INTENT_DATA_MAP[intent],
      confidence,
    };
  } catch {
    return {
      intent: 'discussion',
      requiredData: INTENT_DATA_MAP.discussion,
      confidence: 0.5,
    };
  }
}
