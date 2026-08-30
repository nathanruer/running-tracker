import 'server-only';
import { createGroq } from '@ai-sdk/groq';
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { prisma } from '@/server/database';
import { logger } from '@/server/infrastructure/logger';
import { toPrismaJson } from '@/server/utils/prisma-json';
import { getHttpStatus } from '@/lib/utils/error';
import { getOptimizedConversationHistory } from './optimizer';
import { AGENT_SYSTEM_PROMPT } from './prompts/system';
import { buildAgentTools, type ProposedRecommendations } from './tools';
import { GROQ_MODEL, GROQ_MAX_TOKENS, GROQ_TEMPERATURE } from './groq-client';
import type { AIResponseValidated } from '@/lib/validation/schemas/ai-response';
import type { Prisma, conversation_messages } from '@prisma/client';

const QUOTA_STATUSES = new Set([429, 413]);
const MAX_AGENT_STEPS = 5;
const QUOTA_MESSAGE = 'Quota de tokens atteint. Veuillez réessayer plus tard.';

export interface StreamContext {
  userId: string;
  conversationId: string;
  userMessage: string;
  skipSaveUserMessage?: boolean;
}

let groqProvider: ReturnType<typeof createGroq> | null = null;

export function getGroqProvider() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Clé API Groq manquante');
  }
  if (!groqProvider) {
    groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqProvider;
}

export function resetAgentProvider(): void {
  groqProvider = null;
}

async function createConversationMessage({
  conversationId,
  role,
  content,
  model,
  payload,
}: {
  conversationId: string;
  role: string;
  content: string;
  model?: string | null;
  payload?: Prisma.InputJsonValue;
}): Promise<conversation_messages> {
  const message = await prisma.conversation_messages.create({
    data: {
      conversationId,
      role,
      content,
      model: model ?? undefined,
      kind: payload ? 'recommendation' : 'text',
      ...(payload ? { payload } : {}),
      ...(model ? { provider: 'groq' } : {}),
    },
  });

  return message;
}

async function updateConversationTimestamp(conversationId: string): Promise<void> {
  await prisma.conversations.updateMany({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

function extractAssistantContent(
  accumulatedText: string,
  recommendations: AIResponseValidated | null
): string {
  if (accumulatedText.trim()) return accumulatedText;
  if (recommendations?.responseType === 'recommendations') {
    return recommendations.week_summary ?? recommendations.rationale ?? 'Voici mes recommandations.';
  }
  return "Je suis là pour t'aider.";
}

function isQuotaError(error: unknown): boolean {
  if (QUOTA_STATUSES.has(getHttpStatus(error) ?? 0)) return true;
  const message = error instanceof Error ? error.message : '';
  return /\b(429|413|rate.?limit)\b/i.test(message);
}

export async function* processStreamingMessage(
  ctx: StreamContext
): AsyncGenerator<{ type: 'chunk' | 'done' | 'json'; data: string }, void, unknown> {
  if (!ctx.skipSaveUserMessage) {
    await createConversationMessage({
      conversationId: ctx.conversationId,
      role: 'user',
      content: ctx.userMessage,
    });
  }

  const history = await getOptimizedConversationHistory(ctx.conversationId);
  const messages: ModelMessage[] = history.messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const proposed: ProposedRecommendations[] = [];
  let accumulatedText = '';

  try {
    const result = streamText({
      model: getGroqProvider()(GROQ_MODEL),
      system: AGENT_SYSTEM_PROMPT,
      messages,
      tools: buildAgentTools(ctx.userId, proposed),
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      temperature: GROQ_TEMPERATURE,
      maxOutputTokens: GROQ_MAX_TOKENS,
    });

    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        accumulatedText += part.text;
        yield { type: 'chunk', data: part.text };
      } else if (part.type === 'tool-result' && part.toolName === 'propose_sessions') {
        const latest = proposed[proposed.length - 1];
        if (latest) {
          yield { type: 'json', data: JSON.stringify(latest.validated) };
        }
      } else if (part.type === 'error') {
        throw part.error;
      }
    }
  } catch (err: unknown) {
    if (isQuotaError(err)) {
      const content = accumulatedText.trim() || QUOTA_MESSAGE;
      await createConversationMessage({
        conversationId: ctx.conversationId,
        role: 'assistant',
        content,
        model: GROQ_MODEL,
      });
      if (!accumulatedText.trim()) {
        yield { type: 'chunk', data: QUOTA_MESSAGE };
      }
      yield { type: 'done', data: '' };
      return;
    }
    logger.error({ err, conversationId: ctx.conversationId }, 'agent-stream-failed');
    throw err;
  }

  const recommendations = proposed[proposed.length - 1]?.validated ?? null;
  const assistantContent = extractAssistantContent(accumulatedText, recommendations);
  const payload =
    recommendations?.responseType === 'recommendations' ? toPrismaJson(recommendations) : null;

  await createConversationMessage({
    conversationId: ctx.conversationId,
    role: 'assistant',
    content: assistantContent,
    model: GROQ_MODEL,
    payload: payload ?? undefined,
  });

  await updateConversationTimestamp(ctx.conversationId);

  yield { type: 'done', data: '' };
}
