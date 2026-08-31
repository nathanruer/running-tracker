import 'server-only';
import { generateText } from 'ai';
import { prisma } from '@/server/database';
import { logger } from '@/server/infrastructure/logger';
import { getModel, modelName, primaryProvider } from './provider';
import { OPTIMIZATION_CONFIG } from './optimizer';

const SUMMARY_TRIGGER_THRESHOLD = 6;
const MESSAGE_EXCERPT_LENGTH = 300;
const MAX_MESSAGES_IN_PROMPT = 20;

const SUMMARY_SYSTEM_PROMPT = `Tu maintiens la mémoire d'une conversation entre un coureur et son coach IA.
À partir du résumé existant et des nouveaux messages, produis un résumé cumulatif en français (150 mots max).
Conserve uniquement l'essentiel durable : objectifs, contraintes et blessures, préférences exprimées, séances proposées/acceptées/refusées, décisions prises.
Réponds avec le résumé seul, sans préambule.`;

export async function maybeRefreshConversationSummary(conversationId: string): Promise<void> {
  try {
    const [conversation, allMessages] = await Promise.all([
      prisma.conversations.findUnique({
        where: { id: conversationId },
        select: { summary: true, summaryMessageCount: true },
      }),
      prisma.conversation_messages.findMany({
        where: { conversationId, role: { not: 'system' } },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      }),
    ]);

    const nonSystem = allMessages.filter((m) => m.role !== 'system');
    const total = nonSystem.length;
    if (total <= OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT) return;

    const lastSummary = conversation?.summary ?? null;
    const countAtGeneration = conversation?.summaryMessageCount ?? 0;

    if (total - countAtGeneration < SUMMARY_TRIGGER_THRESHOLD) return;

    const olderAll = nonSystem.slice(0, total - OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT);
    const coveredCount = Math.max(0, countAtGeneration - OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT);
    const toSummarize = olderAll.slice(coveredCount).slice(-MAX_MESSAGES_IN_PROMPT);
    if (toSummarize.length === 0 && !lastSummary) return;

    const transcript = toSummarize
      .map((m) => `${m.role === 'user' ? 'Coureur' : 'Coach'}: ${m.content.slice(0, MESSAGE_EXCERPT_LENGTH)}`)
      .join('\n');

    const promptParts: string[] = [];
    if (lastSummary) {
      promptParts.push(`Résumé existant:\n${lastSummary}`);
    }
    promptParts.push(`Nouveaux messages:\n${transcript}`);

    const result = await generateText({
      model: getModel(primaryProvider(), 'summary'),
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: promptParts.join('\n\n'),
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    const summaryText = result.text.trim();
    if (!summaryText) return;

    await prisma.conversations.update({
      where: { id: conversationId },
      data: { summary: summaryText, summaryMessageCount: total },
    });

    logger.info(
      { conversationId, summarizedMessages: toSummarize.length, total },
      'conversation-summary-refreshed'
    );
  } catch (err) {
    logger.warn({ err, conversationId }, 'conversation-summary-refresh-failed');
  }
}
