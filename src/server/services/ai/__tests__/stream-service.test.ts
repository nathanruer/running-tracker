import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/server/database';
import type { ProposedRecommendations } from '../tools';

const streamTextMock = vi.hoisted(() => vi.fn());
const buildAgentToolsMock = vi.hoisted(() => vi.fn());

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, streamText: streamTextMock };
});

vi.mock('../tools', () => ({
  buildAgentTools: buildAgentToolsMock,
}));

vi.mock('@/server/database', () => ({
  prisma: {
    conversation_messages: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    conversation_message_payloads: {
      create: vi.fn(),
    },
    conversations: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function fullStreamOf(parts: Array<Record<string, unknown>>) {
  return {
    fullStream: (async function* () {
      for (const part of parts) yield part;
    })(),
  };
}

async function collect(ctx: Parameters<typeof import('../stream-service').processStreamingMessage>[0]) {
  const { processStreamingMessage } = await import('../stream-service');
  const events: Array<{ type: string; data: string }> = [];
  for await (const event of processStreamingMessage(ctx)) {
    events.push(event);
  }
  return events;
}

const baseCtx = { userId: 'user-1', conversationId: 'conv-1', userMessage: 'salut coach' };

const validatedRecommendations = {
  responseType: 'recommendations' as const,
  rationale: 'Plan équilibré.',
  recommended_sessions: [
    { duration_min: 45, estimated_distance_km: 8, recommendation_id: 'rec-1' },
  ],
};

describe('processStreamingMessage (agent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.mocked(prisma.conversation_messages.create).mockResolvedValue({ id: 'msg-1' } as never);
    vi.mocked(prisma.conversation_messages.findMany).mockResolvedValue([
      {
        role: 'user',
        content: 'salut coach',
        createdAt: new Date(),
        conversation_message_payloads: [],
      },
    ] as never);
    vi.mocked(prisma.conversations.updateMany).mockResolvedValue({ count: 1 } as never);
    buildAgentToolsMock.mockImplementation(() => ({}));
  });

  it('streams text deltas and persists the assistant message', async () => {
    streamTextMock.mockReturnValue(
      fullStreamOf([
        { type: 'text-delta', id: 't1', text: 'Salut ' },
        { type: 'text-delta', id: 't1', text: 'champion !' },
      ])
    );

    const events = await collect(baseCtx);

    expect(events).toEqual([
      { type: 'chunk', data: 'Salut ' },
      { type: 'chunk', data: 'champion !' },
      { type: 'done', data: '' },
    ]);

    const assistantCall = vi
      .mocked(prisma.conversation_messages.create)
      .mock.calls.find((call) => call[0].data.role === 'assistant');
    expect(assistantCall?.[0].data.content).toBe('Salut champion !');
  });

  it('saves the user message unless skipSaveUserMessage is set', async () => {
    streamTextMock.mockReturnValue(fullStreamOf([{ type: 'text-delta', id: 't1', text: 'ok' }]));

    await collect(baseCtx);
    const userCalls = vi
      .mocked(prisma.conversation_messages.create)
      .mock.calls.filter((call) => call[0].data.role === 'user');
    expect(userCalls).toHaveLength(1);

    vi.mocked(prisma.conversation_messages.create).mockClear();
    streamTextMock.mockReturnValue(fullStreamOf([{ type: 'text-delta', id: 't1', text: 'ok' }]));
    await collect({ ...baseCtx, skipSaveUserMessage: true });
    const userCallsSkipped = vi
      .mocked(prisma.conversation_messages.create)
      .mock.calls.filter((call) => call[0].data.role === 'user');
    expect(userCallsSkipped).toHaveLength(0);
  });

  it('emits the validated recommendations as a json event and persists the v1 payload', async () => {
    buildAgentToolsMock.mockImplementation(
      (_userId: string, proposed: ProposedRecommendations[]) => {
        proposed.push({ validated: validatedRecommendations });
        return {};
      }
    );
    streamTextMock.mockReturnValue(
      fullStreamOf([
        { type: 'text-delta', id: 't1', text: 'Voici le plan.' },
        { type: 'tool-result', toolName: 'propose_sessions', toolCallId: 'call-1', input: {}, output: 'ok' },
      ])
    );

    const events = await collect(baseCtx);

    const jsonEvent = events.find((e) => e.type === 'json');
    expect(jsonEvent).toBeDefined();
    expect(JSON.parse(jsonEvent!.data)).toEqual(validatedRecommendations);
    expect(events.at(-1)).toEqual({ type: 'done', data: '' });

    expect(prisma.conversation_message_payloads.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ payloadType: 'recommendations', payloadVersion: 'v1' }),
      })
    );
  });

  it('falls back to the rationale when no text was streamed alongside recommendations', async () => {
    buildAgentToolsMock.mockImplementation(
      (_userId: string, proposed: ProposedRecommendations[]) => {
        proposed.push({ validated: validatedRecommendations });
        return {};
      }
    );
    streamTextMock.mockReturnValue(
      fullStreamOf([
        { type: 'tool-result', toolName: 'propose_sessions', toolCallId: 'call-1', input: {}, output: 'ok' },
      ])
    );

    await collect(baseCtx);

    const assistantCall = vi
      .mocked(prisma.conversation_messages.create)
      .mock.calls.find((call) => call[0].data.role === 'assistant');
    expect(assistantCall?.[0].data.content).toBe('Plan équilibré.');
  });

  it('handles quota errors with a persisted quota message', async () => {
    streamTextMock.mockReturnValue(
      fullStreamOf([{ type: 'error', error: new Error('429 rate limit exceeded') }])
    );

    const events = await collect(baseCtx);

    expect(events.at(-2)?.data).toContain('Quota de tokens atteint');
    expect(events.at(-1)).toEqual({ type: 'done', data: '' });
    const assistantCall = vi
      .mocked(prisma.conversation_messages.create)
      .mock.calls.find((call) => call[0].data.role === 'assistant');
    expect(assistantCall?.[0].data.content).toContain('Quota de tokens atteint');
  });

  it('rethrows non-quota errors', async () => {
    streamTextMock.mockReturnValue(
      fullStreamOf([{ type: 'error', error: new Error('boom') }])
    );

    await expect(collect(baseCtx)).rejects.toThrow('boom');
  });
});
