import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { primaryProvider, fallbackProvider, modelName, resetAiProviders } from '../provider';

const KEYS = ['AI_PROVIDER', 'AI_MODEL', 'AI_SUMMARY_MODEL', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GROQ_API_KEY'] as const;

describe('ai provider', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    resetAiProviders();
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('answers with Google as soon as its key is configured', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key';
    process.env.GROQ_API_KEY = 'groq-key';

    expect(primaryProvider()).toBe('google');
    expect(modelName('google')).toBe('gemini-3-flash-preview');
  });

  it('falls back to Groq when Google is not configured', () => {
    process.env.GROQ_API_KEY = 'groq-key';

    expect(primaryProvider()).toBe('groq');
    expect(fallbackProvider()).toBeNull();
  });

  it('keeps the other configured provider as the backup', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key';
    process.env.GROQ_API_KEY = 'groq-key';

    expect(fallbackProvider()).toBe('groq');

    process.env.AI_PROVIDER = 'groq';
    expect(primaryProvider()).toBe('groq');
    expect(fallbackProvider()).toBe('google');
  });

  it('lets the environment pin a model', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key';
    process.env.AI_MODEL = 'gemini-3.6-flash';
    process.env.AI_SUMMARY_MODEL = 'gemini-3.1-flash-lite';

    expect(modelName('google')).toBe('gemini-3.6-flash');
    expect(modelName('google', 'summary')).toBe('gemini-3.1-flash-lite');
  });
});
