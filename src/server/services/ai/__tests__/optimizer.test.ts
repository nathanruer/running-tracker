import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOptimizedConversationHistory, OPTIMIZATION_CONFIG } from '../optimizer';

vi.mock('@/server/database', () => ({
  prisma: {
    chat_messages: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

import { prisma } from '@/server/database';

const mockFindMany = prisma.chat_messages.findMany as ReturnType<typeof vi.fn>;

describe('getOptimizedConversationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all messages without optimization when count is within limit', async () => {
    const messages = [
      { role: 'user', content: 'Hello', recommendations: null, createdAt: new Date() },
      { role: 'assistant', content: 'Hi there', recommendations: null, createdAt: new Date() },
    ];
    mockFindMany.mockResolvedValue(messages);

    const result = await getOptimizedConversationHistory('conv-1');

    expect(result.messages).toHaveLength(2);
    expect(result.tokensSaved).toBe(0);
    expect(result.originalTokenCount).toBe(result.optimizedTokenCount);
  });

  it('should use JSON stringified recommendations for assistant messages', async () => {
    const recommendations = { responseType: 'analysis', message: 'Analysis result' };
    const messages = [
      { role: 'assistant', content: '', recommendations, createdAt: new Date() },
    ];
    mockFindMany.mockResolvedValue(messages);

    const result = await getOptimizedConversationHistory('conv-1');

    expect(result.messages[0].content).toBe(JSON.stringify(recommendations));
  });

  it('should summarize older messages when exceeding limit', async () => {
    const longContent = 'x'.repeat(200);
    const messages = Array.from({ length: 8 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `${longContent} Message ${i}`,
      recommendations: null,
      createdAt: new Date(Date.now() + i * 1000),
    }));
    mockFindMany.mockResolvedValue(messages);

    const result = await getOptimizedConversationHistory('conv-1');

    expect(result.messages[0].role).toBe('system');
    expect(result.messages[0].content).toContain('Résumé de 3 messages');
    expect(result.messages).toHaveLength(OPTIMIZATION_CONFIG.RECENT_MESSAGES_COUNT + 1);
    expect(result.tokensSaved).toBeGreaterThan(0);
  });

  it('should include recommendation summaries in older messages', async () => {
    const messages = [
      { role: 'user', content: 'Question about training', recommendations: null, createdAt: new Date(1) },
      { role: 'assistant', content: '', recommendations: { responseType: 'recommendations', week_summary: 'Week plan' }, createdAt: new Date(2) },
      { role: 'user', content: 'Another question', recommendations: null, createdAt: new Date(3) },
      { role: 'assistant', content: '', recommendations: { responseType: 'analysis', message: 'Performance analysis' }, createdAt: new Date(4) },
      ...Array.from({ length: 5 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Recent ${i}`,
        recommendations: null,
        createdAt: new Date(5 + i),
      })),
    ];
    mockFindMany.mockResolvedValue(messages);

    const result = await getOptimizedConversationHistory('conv-1');

    const summary = result.messages[0].content;
    expect(summary).toContain('Question utilisateur');
    expect(summary).toContain('Recommandations données');
    expect(summary).toContain('Analyse effectuée');
  });

  it('should calculate token savings correctly', async () => {
    const longContent = 'x'.repeat(400);
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: longContent,
      recommendations: null,
      createdAt: new Date(i),
    }));
    mockFindMany.mockResolvedValue(messages);

    const result = await getOptimizedConversationHistory('conv-1');

    expect(result.originalTokenCount).toBeGreaterThan(result.optimizedTokenCount);
    expect(result.tokensSaved).toBe(result.originalTokenCount - result.optimizedTokenCount);
  });

  it('should handle empty conversation', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getOptimizedConversationHistory('conv-1');

    expect(result.messages).toHaveLength(0);
    expect(result.tokensSaved).toBe(0);
  });

  it('should handle assistant message with plain content fallback', async () => {
    const messages = [
      { role: 'assistant', content: 'Plain assistant response', recommendations: null, createdAt: new Date(0) },
      ...Array.from({ length: 6 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} with some text`,
        recommendations: null,
        createdAt: new Date(i + 1),
      })),
    ];
    mockFindMany.mockResolvedValue(messages);

    const result = await getOptimizedConversationHistory('conv-1');

    expect(result.messages[0].content).toContain('Réponse:');
  });
});
