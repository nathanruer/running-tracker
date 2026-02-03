const DEFAULT_MAX_LENGTH = 500;
const LOG_MAX_LENGTH = 200;

const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitizes user input for safe inclusion in AI prompts.
 * - Removes control characters
 * - Truncates to max length
 * - Trims whitespace
 */
export function sanitizeForPrompt(input: string | null | undefined, maxLength = DEFAULT_MAX_LENGTH): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(CONTROL_CHAR_REGEX, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes text for logging purposes.
 * - Removes control characters
 * - Truncates to max length
 * - Redacts potential sensitive patterns
 */
export function sanitizeForLog(text: string | null | undefined, maxLength = LOG_MAX_LENGTH): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(CONTROL_CHAR_REGEX, '')
    .trim()
    .slice(0, maxLength);
}
