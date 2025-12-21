import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { logger } from '@/lib/infrastructure/logger';
import { jsonError } from '@/lib/utils/api';
import { normalizeSessions } from '@/lib/domain/sessions/normalizer';
import {
  buildSystemPrompt,
  buildContextMessage,
  getOptimizedConversationHistory,
  extractJsonFromAI,
  callGroq,
  validateAndFixRecommendations,
  GROQ_MODEL,
} from '@/lib/services/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conversationId: string | undefined;

  try {
    const { id } = await params;
    conversationId = id;

    const userId = getUserIdFromRequest(request);
    if (!userId) return jsonError('Non authentifié', 401);

    const body = await request.json();
    if (!body?.content || typeof body.content !== 'string') {
      return jsonError('Contenu invalide');
    }

    const [user, conversation, sessions] = await Promise.all([
      prisma.users.findUnique({ where: { id: userId } }),
      prisma.chat_conversations.findFirst({
        where: { id, userId },
        select: { id: true },
      }),
      prisma.training_sessions.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
      }),
    ]);

    if (!user) return jsonError('Utilisateur non trouvé', 404);
    if (!conversation) return jsonError('Conversation non trouvée', 404);

    const mappedSessions = normalizeSessions(sessions);

    const currentWeek =
      mappedSessions.length > 0
        ? Math.max(
            ...mappedSessions
              .filter(s => s.week !== null)
              .map(s => s.week ?? 1),
            1
          )
        : 1;

    const currentWeekSessions = mappedSessions.filter(
      s => s.week === currentWeek
    );

    const lastCompleted = mappedSessions.find(
      s => s.status === 'completed'
    );
    const nextSessionNumber = lastCompleted && lastCompleted.sessionNumber
      ? lastCompleted.sessionNumber + 1
      : 1;

    const userMessage = await prisma.chat_messages.create({
      data: {
        conversationId,
        role: 'user',
        content: body.content,
      },
    });

    const optimizedHistory =
      await getOptimizedConversationHistory(conversationId);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'user',
        content: buildContextMessage({
          currentWeekSessions,
          allSessions: mappedSessions,
          userProfile: {
            maxHeartRate: user.maxHeartRate ?? undefined,
            vma: user.vma ?? undefined,
            age: user.age ?? undefined,
            goal: user.goal ?? undefined,
          },
          nextSessionNumber,
        }),
      },
      ...optimizedHistory.messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    let completion;
    try {
      completion = await callGroq(messages);
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error?.status === 429) {
        const assistantMessage = await prisma.chat_messages.create({
          data: {
            conversationId,
            role: 'assistant',
            content:
              "Quota de tokens atteint. Veuillez réessayer plus tard.",
            model: GROQ_MODEL,
          },
        });

        return NextResponse.json({
          userMessage,
          assistantMessage,
        });
      }
      throw err;
    }

    const rawText = completion.choices[0]?.message?.content ?? '';
    const response = validateAndFixRecommendations(
      extractJsonFromAI(rawText)
    );

    const assistantMessage = await prisma.chat_messages.create({
      data: {
        conversationId,
        role: 'assistant',
        content:
          response.responseType === 'conversation'
            ? response.message
            : response.week_summary ??
              response.rationale ??
              "Voici vos recommandations.",
        recommendations:
          response.responseType === 'recommendations' ? (response as unknown as Prisma.InputJsonValue) : undefined,
        model: GROQ_MODEL,
      },
    });

    await prisma.chat_conversations.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      userMessage,
      assistantMessage,
      response,
    });
  } catch (error) {
    logger.error(
      { error, conversationId },
      'Erreur POST conversation'
    );

    return NextResponse.json(
      {
        error: "Erreur lors de l'ajout du message",
        details:
          error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}
