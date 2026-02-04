import 'server-only';
import Groq from 'groq-sdk';
import { prisma } from '@/server/database';
import { logger } from '@/server/infrastructure/logger';
import { toPrismaJson } from '@/server/utils/prisma-json';
import { getHttpStatus } from '@/lib/utils/error';
import { classifyIntent } from './intent';
import { fetchConditionalContext } from './data';
import { buildDynamicPrompt } from './prompts';
import { getOptimizedConversationHistory } from './optimizer';
import { extractJsonFromAI, AIParseError } from './parser';
import { validateAndFixRecommendations, validateAIResponse } from './validator';
import { callGroq, streamGroq, GROQ_MODEL } from './groq-client';
import type { Intent } from './intent/types';
import type { AIResponseValidated } from '@/lib/validation/schemas/ai-response';
import type { chat_messages } from '@prisma/client';

export interface StreamContext {
  userId: string;
  conversationId: string;
  userMessage: string;
  skipSaveUserMessage?: boolean;
}

export interface StreamResult {
  userMessageId: string;
  intent: Intent;
  requiresJson: boolean;
}

export async function prepareStreamContext(ctx: StreamContext): Promise<StreamResult> {
  const intentResult = await classifyIntent(ctx.userMessage);

  const userMessage = await prisma.chat_messages.create({
    data: {
      conversationId: ctx.conversationId,
      role: 'user',
      content: ctx.userMessage,
    },
  });

  return {
    userMessageId: userMessage.id,
    intent: intentResult.intent,
    requiresJson: intentResult.intent === 'recommendation_request',
  };
}

function buildMessages(
  systemPrompt: string,
  contextMessage: string | null,
  optimizedHistory: { messages: Array<{ role: string; content: string }> }
): Groq.Chat.ChatCompletionMessageParam[] {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (contextMessage) {
    messages.push({ role: 'user', content: contextMessage });
  }

  messages.push(
    ...optimizedHistory.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))
  );

  return messages;
}

export async function* processStreamingMessage(
  ctx: StreamContext
): AsyncGenerator<{ type: 'chunk' | 'done' | 'json'; data: string }, void, unknown> {
  const intentResult = await classifyIntent(ctx.userMessage);
  const intent = intentResult.intent;
  const requiresJson = intent === 'recommendation_request';

  if (!ctx.skipSaveUserMessage) {
    await prisma.chat_messages.create({
      data: {
        conversationId: ctx.conversationId,
        role: 'user',
        content: ctx.userMessage,
      },
    });
  }

  const fetchedContext = await fetchConditionalContext(ctx.userId, intentResult.requiredData);
  const { systemPrompt, contextMessage } = buildDynamicPrompt(intent, fetchedContext);
  const optimizedHistory = await getOptimizedConversationHistory(ctx.conversationId);
  const messages = buildMessages(systemPrompt, contextMessage, optimizedHistory);

  if (requiresJson) {
    yield* processJsonResponse(ctx, messages);
  } else {
    yield* processTextResponse(ctx, messages);
  }
}

async function* processJsonResponse(
  ctx: StreamContext,
  messages: Groq.Chat.ChatCompletionMessageParam[]
): AsyncGenerator<{ type: 'chunk' | 'done' | 'json'; data: string }, void, unknown> {
  try {
    const completion = await callGroq(messages);
    const rawText = completion.choices[0]?.message?.content ?? '';

    let parsedResponse: unknown;
    try {
      parsedResponse = extractJsonFromAI(rawText);
    } catch (e) {
      if (e instanceof AIParseError) {
        logger.warn({ rawText: rawText.substring(0, 500) }, 'AI response parse error');
        parsedResponse = {
          responseType: 'conversation' as const,
          message: 'Je rencontre un probleme technique. Peux-tu reformuler ta demande?',
        };
      } else {
        throw e;
      }
    }

    const validationResult = validateAIResponse(parsedResponse);
    if (!validationResult.success) {
      logger.warn({ error: validationResult.error }, 'AI response validation failed');
    }

    const response = validateAndFixRecommendations(parsedResponse);
    const assistantContent = extractAssistantContent(response);

    await prisma.chat_messages.create({
      data: {
        conversationId: ctx.conversationId,
        role: 'assistant',
        content: assistantContent,
        recommendations:
          response.responseType === 'recommendations' ? toPrismaJson(response) : undefined,
        model: GROQ_MODEL,
      },
    });

    await updateConversationTimestamp(ctx.conversationId);

    yield { type: 'json', data: JSON.stringify(response) };
    yield { type: 'done', data: '' };
  } catch (err: unknown) {
    if (getHttpStatus(err) === 429) {
      await createRateLimitMessage(ctx.conversationId);
      yield { type: 'chunk', data: 'Quota de tokens atteint. Veuillez reessayer plus tard.' };
      yield { type: 'done', data: '' };
      return;
    }
    throw err;
  }
}

async function* processTextResponse(
  ctx: StreamContext,
  messages: Groq.Chat.ChatCompletionMessageParam[]
): AsyncGenerator<{ type: 'chunk' | 'done' | 'json'; data: string }, void, unknown> {
  const chunks: string[] = [];

  try {
    for await (const chunk of streamGroq(messages)) {
      chunks.push(chunk);
      yield { type: 'chunk', data: chunk };
    }

    await prisma.chat_messages.create({
      data: {
        conversationId: ctx.conversationId,
        role: 'assistant',
        content: chunks.join(''),
        model: GROQ_MODEL,
      },
    });

    await updateConversationTimestamp(ctx.conversationId);

    yield { type: 'done', data: '' };
  } catch (err: unknown) {
    if (getHttpStatus(err) === 429) {
      await createRateLimitMessage(ctx.conversationId);
      yield { type: 'chunk', data: 'Quota de tokens atteint. Veuillez reessayer plus tard.' };
      yield { type: 'done', data: '' };
      return;
    }
    throw err;
  }
}

function extractAssistantContent(response: AIResponseValidated): string {
  if (response.responseType === 'conversation') {
    return response.message || 'Je suis la pour t\'aider.';
  }
  return response.week_summary ?? response.rationale ?? 'Voici mes recommandations.';
}

async function updateConversationTimestamp(conversationId: string): Promise<void> {
  await prisma.chat_conversations.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

async function createRateLimitMessage(conversationId: string): Promise<chat_messages> {
  return prisma.chat_messages.create({
    data: {
      conversationId,
      role: 'assistant',
      content: 'Quota de tokens atteint. Veuillez reessayer plus tard.',
      model: GROQ_MODEL,
    },
  });
}
