import 'server-only';
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { prisma } from '@/server/database';
import { logger } from '@/server/infrastructure/logger';
import { toPrismaJson } from '@/server/utils/prisma-json';
import { getHttpStatus } from '@/lib/utils/error';
import { getOptimizedConversationHistory } from './optimizer';
import { AGENT_SYSTEM_PROMPT } from './prompts/system';
import { buildAgentTools, type ProposedRecommendations } from './tools';
import { buildAthleteForm, formatAthleteForm, type AthleteForm } from './context/form-context';
import { buildProfileContext } from './context/profile-context';
import { fetchSessions, fetchProfile, fetchNextSessionNumber } from './data/fetcher';
import { buildPlannedContext } from './context/planned-context';
import {
  getModel,
  modelName,
  primaryProvider,
  fallbackProvider,
  AI_MAX_TOKENS,
  AI_TEMPERATURE,
  AI_FIRST_TOKEN_TIMEOUT_MS,
  type AiProvider,
} from './provider';
import type { AIResponseValidated } from '@/lib/validation/schemas/ai-response';
import type { Prisma, conversation_messages } from '@prisma/client';

const QUOTA_STATUSES = new Set([429, 413]);
// Profile, form and plan travel with the prompt: one optional lookup, the proposal, the closing
// sentence. Fewer steps also means fewer round-trips before the serverless budget runs out.
const MAX_AGENT_STEPS = 3;
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

  // Profile, measured form and current plan are read once and handed to the model with the prompt:
  // three round-trips saved per answer, and the form is never something the model has to ask for.
  let form: AthleteForm | null = null;
  let context = '';
  try {
    const [sessions, profile, nextSessionNumber, planned] = await Promise.all([
      fetchSessions(ctx.userId, 40),
      fetchProfile(ctx.userId),
      fetchNextSessionNumber(ctx.userId),
      buildPlannedContext(ctx.userId),
    ]);
    form = buildAthleteForm(sessions);
    context = [buildProfileContext(profile, nextSessionNumber), formatAthleteForm(form), planned]
      .filter(Boolean)
      .join('\n\n');
  } catch (err) {
    logger.warn({ err, userId: ctx.userId }, 'athlete-context-unavailable');
  }
  const system = context ? `${AGENT_SYSTEM_PROMPT}\n\n${context}` : AGENT_SYSTEM_PROMPT;

  const proposed: ProposedRecommendations[] = [];
  let accumulatedText = '';

  const tools = buildAgentTools(ctx.userId, proposed, form);

  let provider = primaryProvider();

  async function* readAgent(current: AiProvider, patience?: number) {
    // The wait is bounded until the first sign of life only: an answer under way is never cut.
    const controller = new AbortController();
    const timer = patience ? setTimeout(() => controller.abort(), patience) : null;
    const result = streamText({
      model: getModel(current),
      system,
      messages,
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      temperature: AI_TEMPERATURE,
      maxOutputTokens: AI_MAX_TOKENS,
      abortSignal: controller.signal,
    });

    try {
      for await (const part of result.fullStream) {
        if (timer) clearTimeout(timer);

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
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  try {
    try {
      yield* readAgent(provider, fallbackProvider() ? AI_FIRST_TOKEN_TIMEOUT_MS : undefined);
    } catch (err: unknown) {
      const backup = fallbackProvider();
      // Nothing streamed yet: the answer can be restarted on the other provider without repeating.
      if (!backup || accumulatedText.trim() || proposed.length) throw err;

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
