import type { AIResponse } from './types';

/**
 * Extracts and parses JSON from AI response text
 * Handles markdown code blocks and finds JSON objects within text
 *
 * @param text Raw text from AI response
 * @returns Parsed JSON object
 * @throws Error if no valid JSON found in response
 */
export function extractJsonFromAI(text: string): AIResponse {
  let cleaned = text.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');

  if (first === -1 || last === -1) {
    throw new Error('JSON non trouvé dans la réponse IA');
  }

  return JSON.parse(cleaned.slice(first, last + 1));
}
