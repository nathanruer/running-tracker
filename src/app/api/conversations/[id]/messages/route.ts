import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { jsonError } from '@/lib/utils/api-helpers';
import { normalizeSessions } from '@/lib/domain/sessions/normalizer';
import { handleApiRequest } from '@/lib/services/api-handlers';
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
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const conversationId = params.id;

      const body = await request.json();
      if (!body?.content || typeof body.content !== 'string') {
        return jsonError('Contenu invalide');
      }

      const [user, conversation, sessions] = await Promise.all([
        prisma.users.findUnique({ where: { id: userId } }),
        prisma.chat_conversations.findFirst({
          where: { id: conversationId, userId },
          select: { id: true },
        }),
        prisma.training_sessions.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          select: {
            id: true,
            sessionNumber: true,
            week: true,
            date: true,
            sessionType: true,
            duration: true,
            distance: true,
            avgPace: true,
            avgHeartRate: true,
            comments: true,
            intervalDetails: true,
            perceivedExertion: true,
            status: true,
            targetPace: true,
            targetDuration: true,
            targetDistance: true,

            targetHeartRateBpm: true,
            targetRPE: true,
          },
          take: 50,
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
      
      let parsedResponse;
      try {
        parsedResponse = extractJsonFromAI(rawText);
      } catch {
        parsedResponse = { 
          responseType: 'conversation' as const, 
          message: "Erreur de format de réponse." 
        };
      }

      const response = validateAndFixRecommendations(parsedResponse);

      const assistantContent = (() => {
        if (response.responseType === 'conversation') {
          return response.message || "Je n'ai pas pu générer une réponse complète.";
        }
        return response.week_summary ?? response.rationale ?? "Voici vos recommandations.";
      })();

      const assistantMessage = await prisma.chat_messages.create({
        data: {
          conversationId,
          role: 'assistant',
          content: assistantContent,
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
    },
    { logContext: 'create-chat-message' }
  );
}
