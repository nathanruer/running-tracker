import { prisma } from '@/lib/database';
import { logger } from '@/lib/infrastructure/logger';
import type { ChatMessage } from '@/lib/types';

export const OPTIMIZATION_CONFIG = {
  RECENT_MESSAGES_COUNT: 5,
};

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

async function summarizeMessages(messages: ChatMessage[]): Promise<string> {
  if (messages.length === 0) return '';
  
  const keyPoints: string[] = [];
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      keyPoints.push(`Question utilisateur: ${msg.content.substring(0, 100)}`);
    } else if (msg.role === 'assistant') {
      if (msg.recommendations) {
        const recs = msg.recommendations as any;
        const recType = recs.responseType;
        if (recType === 'recommendations') {
          keyPoints.push(
            `Recommandations données: ${recs.week_summary || 'Plan d\'entraînement fourni'}`
          );
        } else if (recType === 'analysis') {
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

export async function getOptimizedConversationHistory(
  conversationId: string,
  currentUserMessage: string
): Promise<{
  messages: Array<{ role: string; content: string }>;
  tokensSaved: number;
  originalTokenCount: number;
  optimizedTokenCount: number;
}> {
  const allMessages = await prisma.chat_messages.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });

  const totalMessages = allMessages.length;
  
  if (totalMessages <= OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT) {
    const messages = allMessages.map(msg => ({
      role: msg.role,
      content: msg.role === 'assistant' && msg.recommendations
        ? JSON.stringify(msg.recommendations)
        : msg.content,
    }));
    
    const tokenCount = messages.reduce(
      (sum, msg) => sum + estimateTokenCount(msg.content),
      0
    );
    
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

  const summary = await summarizeMessages(olderMessages);
  
  const optimizedMessages: Array<{ role: string; content: string }> = [];
  
  if (summary) {
    optimizedMessages.push({
      role: 'system',
      content: summary,
    });
  }

  for (const msg of recentMessages) {
    optimizedMessages.push({
      role: msg.role,
      content: msg.role === 'assistant' && msg.recommendations
        ? JSON.stringify(msg.recommendations)
        : msg.content,
    });
  }

  const originalTokenCount = allMessages.reduce(
    (sum, msg) => {
      const content = msg.role === 'assistant' && msg.recommendations
        ? JSON.stringify(msg.recommendations)
        : msg.content;
      return sum + estimateTokenCount(content);
    },
    0
  );

  const optimizedTokenCount = optimizedMessages.reduce(
    (sum, msg) => sum + estimateTokenCount(msg.content),
    0
  );

  const tokensSaved = originalTokenCount - optimizedTokenCount;

  logger.info({
    conversationId,
    totalMessages,
    recentMessages: recentCount,
    summarizedMessages: olderMessages.length,
    originalTokenCount,
    optimizedTokenCount,
    tokensSaved,
    compressionRatio: (optimizedTokenCount / originalTokenCount).toFixed(2),
  }, 'Conversation history optimized');

  return {
    messages: optimizedMessages,
    tokensSaved,
    originalTokenCount,
    optimizedTokenCount,
  };
}
