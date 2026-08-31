import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/server/database', () => ({
  prisma: {
    conversation_messages: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    conversations: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../provider', () => ({
  getModel: vi.fn(() => 'mock-model'),
  modelName: vi.fn(() => 'mock-model'),
  primaryProvider: vi.fn(() => 'google'),
}));

import { prisma } from '@/server/database';
import { generateText } from 'ai';
import { maybeRefreshConversationSummary } from '../summarizer';

const mockFindMany = prisma.conversation_messages.findMany as ReturnType<typeof vi.fn>;
const mockCreateMessage = prisma.conversation_messages.create as ReturnType<typeof vi.fn>;
const mockGenerateText = generateText as ReturnType<typeof vi.fn>;

function makeMessages(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i}`,
    createdAt: new Date(2026, 0, 1, 0, i),
  }));
}

describe('maybeRefreshConversationSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMessage.mockResolvedValue({ id: 'summary-msg' });
    vi.mocked(prisma.conversations.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.conversations.update).mockResolvedValue({} as never);
    mockGenerateText.mockResolvedValue({ text: 'Résumé cumulatif de la conversation.' });
  });

  it('does nothing for short conversations', async () => {
    mockFindMany.mockResolvedValue(makeMessages(10));

    await maybeRefreshConversationSummary('conv-1');

    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(mockCreateMessage).not.toHaveBeenCalled();
  });

  it('generates and persists a summary once the window is exceeded', async () => {
    mockFindMany.mockResolvedValue(makeMessages(20));

    await maybeRefreshConversationSummary('conv-1');

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockCreateMessage).not.toHaveBeenCalled();
    expect(prisma.conversations.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { summary: 'Résumé cumulatif de la conversation.', summaryMessageCount: 20 },
    });
  });

  it('throttles regeneration until enough new messages accumulate', async () => {
    const messages = makeMessages(20);
    vi.mocked(prisma.conversations.findUnique).mockResolvedValue(
      { summary: 'Ancien résumé.', summaryMessageCount: 18 } as never
    );
    mockFindMany.mockResolvedValue(messages);

    await maybeRefreshConversationSummary('conv-1');

    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('feeds the previous summary into the regeneration prompt', async () => {
    const messages = makeMessages(30);
    vi.mocked(prisma.conversations.findUnique).mockResolvedValue(
      { summary: 'Ancien résumé.', summaryMessageCount: 18 } as never
    );
    mockFindMany.mockResolvedValue(messages);

    await maybeRefreshConversationSummary('conv-1');

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const call = mockGenerateText.mock.calls[0][0];
    expect(call.prompt).toContain('Ancien résumé.');
    expect(prisma.conversations.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { summary: 'Résumé cumulatif de la conversation.', summaryMessageCount: 30 },
    });
  });

  it('never throws when generation fails', async () => {
    mockFindMany.mockResolvedValue(makeMessages(20));
    mockGenerateText.mockRejectedValue(new Error('429 rate limit'));

    await expect(maybeRefreshConversationSummary('conv-1')).resolves.toBeUndefined();
    expect(mockCreateMessage).not.toHaveBeenCalled();
  });
});
