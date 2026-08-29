import 'server-only';
import { generateText } from 'ai';
import { prisma } from '@/server/database';
import { logger } from '@/server/infrastructure/logger';
import { toPrismaJson } from '@/server/utils/prisma-json';
import { getGroqProvider } from './stream-service';
import { GROQ_SUMMARY_MODEL } from './groq-client';
import { OPTIMIZATION_CONFIG } from './optimizer';

export const SUMMARY_PAYLOAD_TYPE = 'summary_meta';
const SUMMARY_TRIGGER_THRESHOLD = 6;
const MESSAGE_EXCERPT_LENGTH = 300;
const MAX_MESSAGES_IN_PROMPT = 20;

const SUMMARY_SYSTEM_PROMPT = `Tu maintiens la mémoire d'une conversation entre un coureur et son coach IA.
À partir du résumé existant et des nouveaux messages, produis un résumé cumulatif en français (150 mots max).
Conserve uniquement l'essentiel durable : objectifs, contraintes et blessures, préférences exprimées, séances proposées/acceptées/refusées, décisions prises.
Réponds avec le résumé seul, sans préambule.`;

interface SummaryMeta {
  messageCountAtGeneration: number;
}

export function readSummaryMeta(payload: unknown): SummaryMeta | null {
  if (
    payload &&
    typeof payload === 'object' &&
    'messageCountAtGeneration' in payload &&
    typeof (payload as SummaryMeta).messageCountAtGeneration === 'number'
  ) {
    return payload as SummaryMeta;
  }
  return null;
}

export async function maybeRefreshConversationSummary(conversationId: string): Promise<void> {
  try {
    const allMessages = await prisma.conversation_messages.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { conversation_message_payloads: true },
    });

    const nonSystem = allMessages.filter((m) => m.role !== 'system');
    const total = nonSystem.length;
    if (total <= OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT) return;

    const summaries = allMessages.filter((m) => m.role === 'system');
    const lastSummary = summaries[summaries.length - 1] ?? null;
    const lastMeta = lastSummary
      ? readSummaryMeta(
          lastSummary.conversation_message_payloads.find(
            (p) => p.payloadType === SUMMARY_PAYLOAD_TYPE
          )?.payload
        )
      : null;
    const countAtGeneration = lastMeta?.messageCountAtGeneration ?? 0;

    if (total - countAtGeneration < SUMMARY_TRIGGER_THRESHOLD) return;

    const olderAll = nonSystem.slice(0, total - OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT);
    const coveredCount = Math.max(0, countAtGeneration - OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT);
    const toSummarize = olderAll.slice(coveredCount).slice(-MAX_MESSAGES_IN_PROMPT);
    if (toSummarize.length === 0 && !lastSummary) return;

    const transcript = toSummarize
      .map((m) => `${m.role === 'user' ? 'Coureur' : 'Coach'}: ${m.content.slice(0, MESSAGE_EXCERPT_LENGTH)}`)
      .join('\n');

    const promptParts: string[] = [];
    if (lastSummary?.content) {
      promptParts.push(`Résumé existant:\n${lastSummary.content}`);
    }
    promptParts.push(`Nouveaux messages:\n${transcript}`);

    const result = await generateText({
      model: getGroqProvider()(GROQ_SUMMARY_MODEL),
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: promptParts.join('\n\n'),
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    const summaryText = result.text.trim();
    if (!summaryText) return;

    const message = await prisma.conversation_messages.create({
      data: {
        conversationId,
        role: 'system',
        content: summaryText,
        model: GROQ_SUMMARY_MODEL,
      },
    });
    await prisma.conversation_message_payloads.create({
      data: {
        messageId: message.id,
        payloadType: SUMMARY_PAYLOAD_TYPE,
        payload: toPrismaJson({ messageCountAtGeneration: total }),
      },
    });

    logger.info(
      { conversationId, summarizedMessages: toSummarize.length, total },
      'conversation-summary-refreshed'
    );
  } catch (err) {
    logger.warn({ err, conversationId }, 'conversation-summary-refresh-failed');
  }
}
