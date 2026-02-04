import 'server-only';
import { prisma } from '@/server/database';
import { logger } from '@/server/infrastructure/logger';
import type { Prisma } from '@prisma/client';

type ChatRole = 'user' | 'assistant' | 'system';

interface ChatMessageRecord {
  role: ChatRole;
  content: string;
  recommendations: Prisma.JsonValue;
  createdAt: Date;
}

interface RecommendationData {
  responseType?: string;
  week_summary?: string;
  message?: string;
}

export const OPTIMIZATION_CONFIG = {
  RECENT_MESSAGES_COUNT: 5,
};

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function mapMessageContent(msg: ChatMessageRecord): string {
  if (msg.role === 'assistant' && msg.recommendations) {
    return JSON.stringify(msg.recommendations);
  }
  return msg.content;
}

function summarizeMessages(messages: ChatMessageRecord[]): string {
  if (messages.length === 0) return '';

  const keyPoints: string[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      keyPoints.push(`Question utilisateur: ${msg.content.substring(0, 100)}`);
    } else if (msg.role === 'assistant') {
      if (msg.recommendations && typeof msg.recommendations === 'object') {
        const recs = msg.recommendations as RecommendationData;
        if (recs.responseType === 'recommendations') {
          keyPoints.push(
            `Recommandations données: ${recs.week_summary || "Plan d'entraînement fourni"}`
          );
        } else if (recs.responseType === 'analysis') {
          keyPoints.push(
            `Analyse effectuée: ${recs.message?.substring(0, 100) || 'Analyse de performance'}`
          );
        }
      } else {
        keyPoints.push(`Réponse: ${msg.content.substring(0, 100)}`);
      }
    }
  }

  return `[Résumé de ${messages.length} messages précédents]\n${keyPoints.join('\n')}`;
}

export interface OptimizedHistory {
  messages: Array<{ role: ChatRole; content: string }>;
  tokensSaved: number;
  originalTokenCount: number;
  optimizedTokenCount: number;
}

export async function getOptimizedConversationHistory(
  conversationId: string
): Promise<OptimizedHistory> {
  const allMessages = await prisma.chat_messages.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });

  const totalMessages = allMessages.length;

  if (totalMessages <= OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT) {
    const messages = allMessages.map(msg => ({
      role: msg.role as ChatRole,
      content: mapMessageContent(msg as ChatMessageRecord),
    }));

    const tokenCount = messages.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);

    return {
      messages,
      tokensSaved: 0,
      originalTokenCount: tokenCount,
      optimizedTokenCount: tokenCount,
    };
  }

  const recentCount = OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT;
  const recentMessages = allMessages.slice(-recentCount);
  const olderMessages = allMessages.slice(0, -recentCount);

  const summary = summarizeMessages(olderMessages as ChatMessageRecord[]);

  const optimizedMessages: Array<{ role: ChatRole; content: string }> = [];

  if (summary) {
    optimizedMessages.push({
      role: 'system',
      content: summary,
    });
  }

  for (const msg of recentMessages) {
    optimizedMessages.push({
      role: msg.role as ChatRole,
      content: mapMessageContent(msg as ChatMessageRecord),
    });
  }

  const originalTokenCount = allMessages.reduce(
    (sum, msg) => sum + estimateTokenCount(mapMessageContent(msg as ChatMessageRecord)),
    0
  );

  const optimizedTokenCount = optimizedMessages.reduce(
    (sum, msg) => sum + estimateTokenCount(msg.content),
    0
  );

  const tokensSaved = originalTokenCount - optimizedTokenCount;

  logger.info(
    {
      conversationId,
      totalMessages,
      recentMessages: recentCount,
      summarizedMessages: olderMessages.length,
      originalTokenCount,
      optimizedTokenCount,
      tokensSaved,
      compressionRatio: (optimizedTokenCount / originalTokenCount).toFixed(2),
    },
    'Conversation history optimized'
  );

  return {
    messages: optimizedMessages,
    tokensSaved,
    originalTokenCount,
    optimizedTokenCount,
  };
}
