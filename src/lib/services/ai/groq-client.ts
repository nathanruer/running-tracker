import Groq from 'groq-sdk';

export const GROQ_MODEL = 'openai/gpt-oss-120b';
export const GROQ_MAX_TOKENS = 16000;
export const GROQ_TEMPERATURE = 0.7;

let groqInstance: Groq | null = null;

function getGroqClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Clé API Groq manquante');
  }
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqInstance;
}

export function resetGroqClient(): void {
  groqInstance = null;
}

export async function callGroq(
  messages: Groq.Chat.ChatCompletionMessageParam[]
): Promise<Groq.Chat.ChatCompletion> {
  const groq = getGroqClient();

  return groq.chat.completions.create({
    messages,
    model: GROQ_MODEL,
    temperature: GROQ_TEMPERATURE,
    max_tokens: GROQ_MAX_TOKENS,
    response_format: { type: 'json_object' },
  });
}

export async function callGroqText(
  messages: Groq.Chat.ChatCompletionMessageParam[]
): Promise<Groq.Chat.ChatCompletion> {
  const groq = getGroqClient();

  return groq.chat.completions.create({
    messages,
    model: GROQ_MODEL,
    temperature: GROQ_TEMPERATURE,
    max_tokens: GROQ_MAX_TOKENS,
  });
}

export async function* streamGroq(
  messages: Groq.Chat.ChatCompletionMessageParam[]
): AsyncGenerator<string, void, unknown> {
  const groq = getGroqClient();

  const stream = await groq.chat.completions.create({
    messages,
    model: GROQ_MODEL,
    temperature: GROQ_TEMPERATURE,
    max_tokens: GROQ_MAX_TOKENS,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export async function collectStreamedResponse(
  messages: Groq.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  const chunks: string[] = [];

  for await (const chunk of streamGroq(messages)) {
    chunks.push(chunk);
  }

  return chunks.join('');
}
