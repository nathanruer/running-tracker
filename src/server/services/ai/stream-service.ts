import 'server-only';
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { prisma } from '@/server/database';
import { logger } from '@/server/infrastructure/logger';
import { toPrismaJson } from '@/server/utils/prisma-json';
import { getHttpStatus } from '@/lib/utils/error';
import { getOptimizedConversationHistory } from './optimizer';
import { AGENT_SYSTEM_PROMPT } from './prompts/system';
import { buildAgentTools, type ProposedRecommendations } from './tools';
import {
  getModel,
  modelName,
  primaryProvider,
  fallbackProvider,
  AI_MAX_TOKENS,
  AI_TEMPERATURE,
  type AiProvider,
} from './provider';
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

  const tools = buildAgentTools(ctx.userId, proposed);
  const runAgent = (provider: AiProvider) =>
    streamText({
      model: getModel(provider),
      system: AGENT_SYSTEM_PROMPT,
      messages,
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      temperature: AI_TEMPERATURE,
      maxOutputTokens: AI_MAX_TOKENS,
    });

  let provider = primaryProvider();

  async function* readAgent(current: AiProvider) {
    const result = runAgent(current);
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        accumulatedText += part.text;
        yield { type: 'chunk' as const, data: part.text };
      } else if (part.type === 'tool-result' && part.toolName === 'propose_sessions') {
        const latest = proposed[proposed.length - 1];
        if (latest) {
          yield { type: 'json' as const, data: JSON.stringify(latest.validated) };
        }
      } else if (part.type === 'error') {
        throw part.error;
      }
    }
  }

  try {
    try {
      yield* readAgent(provider);
    } catch (err: unknown) {
      const backup = fallbackProvider();
      // Nothing streamed yet: the answer can be restarted on the other provider without repeating.
      if (!isQuotaError(err) || !backup || accumulatedText.trim() || proposed.length) throw err;

      logger.warn({ err, from: provider, to: backup }, 'agent-provider-fallback');
      provider = backup;
      proposed.length = 0;
      yield* readAgent(provider);
    }
  } catch (err: unknown) {
    if (isQuotaError(err)) {
      const content = accumulatedText.trim() || QUOTA_MESSAGE;
      await createConversationMessage({
        conversationId: ctx.conversationId,
        role: 'assistant',
        content,
        model: modelName(provider),
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
    model: modelName(provider),
    payload: payload ?? undefined,
  });

  await updateConversationTimestamp(ctx.conversationId);

  yield { type: 'done', data: '' };
}
