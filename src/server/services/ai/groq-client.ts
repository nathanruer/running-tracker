import 'server-only';

export const GROQ_MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';
export const GROQ_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS ?? 3000);
export const GROQ_SUMMARY_MODEL = process.env.GROQ_SUMMARY_MODEL ?? 'openai/gpt-oss-20b';
export const GROQ_TEMPERATURE = 0.7;
