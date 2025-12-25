import Groq from 'groq-sdk';

export const GROQ_MODEL = 'openai/gpt-oss-120b';
export const GROQ_MAX_TOKENS = 12000;
export const GROQ_TEMPERATURE = 0.7;

/**
 * Calls the Groq API to generate AI completions
 *
 * @param messages Array of chat messages to send to the AI
 * @returns Groq completion response
 * @throws Error if GROQ_API_KEY is not configured
 */
export async function callGroq(
  messages: Groq.Chat.ChatCompletionMessageParam[]
): Promise<Groq.Chat.ChatCompletion> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Clé API Groq manquante');
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  return groq.chat.completions.create({
    messages,
    model: GROQ_MODEL,
    temperature: GROQ_TEMPERATURE,
    max_tokens: GROQ_MAX_TOKENS,
    response_format: { type: 'json_object' },
  });
}
