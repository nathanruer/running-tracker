import 'server-only';
import {
  aiResponseSchema,
  type AIResponseValidated,
} from '@/lib/validation/schemas/ai-response';

export class AIParseError extends Error {
  constructor(
    message: string,
    public readonly rawText?: string
  ) {
    super(message);
    this.name = 'AIParseError';
  }
}

export function extractJsonFromAI(text: string): unknown {
  let cleaned = text.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');

  if (first === -1 || last === -1) {
    throw new AIParseError('JSON non trouvé dans la réponse IA', text);
  }

  try {
    return JSON.parse(cleaned.slice(first, last + 1));
  } catch {
    throw new AIParseError('JSON invalide dans la réponse IA', text);
  }
}

export function parseAndValidateAIResponse(text: string): AIResponseValidated {
  const raw = extractJsonFromAI(text);
  const result = aiResponseSchema.safeParse(raw);

  if (!result.success) {
    const errorMessage = result.error.issues[0]?.message ?? 'Validation failed';
    throw new AIParseError(`Validation échouée: ${errorMessage}`, text);
  }

  return result.data;
}
