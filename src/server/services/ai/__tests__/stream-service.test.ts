import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processStreamingMessage, prepareStreamContext } from '../stream-service';
import { AIParseError } from '../parser';

const prismaCreate = vi.hoisted(() => vi.fn());
const prismaUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/server/database', () => ({
  prisma: {
    chat_messages: { create: prismaCreate },
    chat_conversations: { update: prismaUpdate },
  },
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: { warn: vi.fn() },
}));

vi.mock('@/server/utils/prisma-json', () => ({
  toPrismaJson: vi.fn(() => ({ mocked: true })),
}));

const getHttpStatusMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/utils/error', () => ({
  getHttpStatus: (...args: unknown[]) => getHttpStatusMock(...args),
}));

const classifyIntentMock = vi.hoisted(() => vi.fn());
vi.mock('../intent', () => ({
  classifyIntent: (...args: unknown[]) => classifyIntentMock(...args),
}));

vi.mock('../data', () => ({
  fetchConditionalContext: vi.fn(async () => ({ stats: [] })),
}));

vi.mock('../prompts', () => ({
  buildDynamicPrompt: vi.fn(() => ({ systemPrompt: 'sys', contextMessage: 'ctx' })),
}));

vi.mock('../optimizer', () => ({
  getOptimizedConversationHistory: vi.fn(async () => ({ messages: [{ role: 'user', content: 'hi' }] })),
}));

const extractJsonFromAIMock = vi.hoisted(() => vi.fn());
vi.mock('../parser', () => ({
  extractJsonFromAI: (...args: unknown[]) => extractJsonFromAIMock(...args),
  AIParseError: class AIParseError extends Error {},
}));

const validateAndFixRecommendationsMock = vi.hoisted(() => vi.fn((value: unknown) => value));
const validateAIResponseMock = vi.hoisted(() => vi.fn());
vi.mock('../validator', () => ({
  validateAndFixRecommendations: (value: unknown) => validateAndFixRecommendationsMock(value),
  validateAIResponse: (value: unknown) => validateAIResponseMock(value),
}));

const callGroqMock = vi.hoisted(() => vi.fn());
const streamGroqMock = vi.hoisted(() => vi.fn());
vi.mock('../groq-client', () => ({
  GROQ_MODEL: 'mock-model',
  callGroq: (...args: unknown[]) => callGroqMock(...args),
  streamGroq: (...args: unknown[]) => streamGroqMock(...args),
}));

describe('stream-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaCreate.mockResolvedValue({ id: 'msg-1' });
    prismaUpdate.mockResolvedValue({});
    getHttpStatusMock.mockReturnValue(undefined);
    validateAIResponseMock.mockReturnValue({ success: true });
  });

  it('processes json responses and stores assistant message', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'recommendation_request', requiredData: [] });
    callGroqMock.mockResolvedValue({
      choices: [{ message: { content: '{"responseType":"recommendations","week_summary":"ok"}' } }],
    });
    extractJsonFromAIMock.mockReturnValue({
      responseType: 'recommendations',
      week_summary: 'ok',
    });

    const chunks = [];
    for await (const chunk of processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.some((c) => c.type === 'json')).toBe(true);
    expect(chunks.some((c) => c.type === 'done')).toBe(true);
    expect(prismaCreate).toHaveBeenCalled();
    expect(prismaUpdate).toHaveBeenCalled();
  });

  it('processes text responses and streams chunks', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'conversation', requiredData: [] });
    streamGroqMock.mockImplementation(async function* () {
      yield 'A';
      yield 'B';
    });

    const chunks = [];
    for await (const chunk of processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.filter((c) => c.type === 'chunk').map((c) => c.data).join('')).toBe('AB');
    expect(chunks.some((c) => c.type === 'done')).toBe(true);
  });

  it('handles rate limit errors with a fallback message', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'recommendation_request', requiredData: [] });
    callGroqMock.mockRejectedValue(new Error('rate limit'));
    getHttpStatusMock.mockReturnValue(429);

    const chunks = [];
    for await (const chunk of processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    })) {
      chunks.push(chunk);
    }

    expect(chunks[0]?.data).toContain('Quota de tokens atteint');
    expect(chunks.some((c) => c.type === 'done')).toBe(true);
    expect(prismaCreate).toHaveBeenCalled();
  });

  it('handles parse errors with fallback response', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'recommendation_request', requiredData: [] });
    callGroqMock.mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    });
    extractJsonFromAIMock.mockImplementation(() => {
      throw new AIParseError('bad json');
    });

    const chunks = [];
    for await (const chunk of processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.some((c) => c.type === 'json')).toBe(true);
    expect(validateAndFixRecommendationsMock).toHaveBeenCalled();
  });

  it('logs validation warning when response is invalid', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'recommendation_request', requiredData: [] });
    callGroqMock.mockResolvedValue({
      choices: [{ message: { content: '{"responseType":"conversation","message":"ok"}' } }],
    });
    extractJsonFromAIMock.mockReturnValue({
      responseType: 'conversation',
      message: 'ok',
    });
    validateAIResponseMock.mockReturnValueOnce({ success: false as const, error: 'bad', fallback: { responseType: 'conversation', message: 'error' } });

    const chunks = [];
    for await (const chunk of processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.some((c) => c.type === 'json')).toBe(true);
  });

  it('skips saving user message when skipSaveUserMessage is true', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'conversation', requiredData: [] });
    streamGroqMock.mockImplementation(async function* () {
      yield 'A';
    });

    const chunks = [];
    for await (const chunk of processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
      skipSaveUserMessage: true,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.some((c) => c.type === 'done')).toBe(true);
    expect(prismaCreate).toHaveBeenCalledTimes(1);
  });

  it('handles rate limit for text responses', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'conversation', requiredData: [] });
    streamGroqMock.mockImplementation(async function* () {
      throw new Error('rate limit');
    });
    getHttpStatusMock.mockReturnValue(429);

    const chunks = [];
    for await (const chunk of processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    })) {
      chunks.push(chunk);
    }

    expect(chunks[0]?.data).toContain('Quota de tokens atteint');
    expect(prismaCreate).toHaveBeenCalled();
  });

  it('omits context message when prompt has none', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'recommendation_request', requiredData: [] });
    callGroqMock.mockResolvedValue({
      choices: [{ message: { content: '{"responseType":"conversation","message":"ok"}' } }],
    });
    extractJsonFromAIMock.mockReturnValue({
      responseType: 'conversation',
      message: 'ok',
    });

    const buildDynamicPrompt = await import('../prompts');
    vi.mocked(buildDynamicPrompt.buildDynamicPrompt).mockReturnValueOnce({ systemPrompt: 'sys', contextMessage: null, requiresJson: true });

    const chunks = [];
    for await (const chunk of processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    })) {
      chunks.push(chunk);
    }

    const messages = callGroqMock.mock.calls[0][0];
    expect(messages.some((m: { role: string; content: string }) => m.content === 'ctx')).toBe(false);
  });

  it('rethrows non-AIParseError exceptions in JSON response', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'recommendation_request', requiredData: [] });
    callGroqMock.mockResolvedValue({
      choices: [{ message: { content: 'some content' } }],
    });
    const genericError = new Error('generic error');
    extractJsonFromAIMock.mockImplementation(() => {
      throw genericError;
    });

    const generator = processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    });

    await expect(async () => {
      for await (const chunk of generator) void chunk; {
        // consume generator
      }
    }).rejects.toThrow('generic error');
  });

  it('rethrows non-429 errors in JSON response', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'recommendation_request', requiredData: [] });
    const serverError = new Error('server error');
    callGroqMock.mockRejectedValue(serverError);
    getHttpStatusMock.mockReturnValue(500);

    const generator = processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    });

    await expect(async () => {
      for await (const chunk of generator) void chunk; {
        // consume generator
      }
    }).rejects.toThrow('server error');
  });

  it('rethrows non-429 errors in text response', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'conversation', requiredData: [] });
    const serverError = new Error('server error');
    streamGroqMock.mockImplementation(async function* () {
      throw serverError;
    });
    getHttpStatusMock.mockReturnValue(500);

    const generator = processStreamingMessage({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    });

    await expect(async () => {
      for await (const chunk of generator) void chunk; {
        // consume generator
      }
    }).rejects.toThrow('server error');
  });
});

describe('prepareStreamContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaCreate.mockResolvedValue({ id: 'msg-1' });
  });

  it('classifies intent and saves user message', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'conversation', requiredData: [] });

    const result = await prepareStreamContext({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'hello',
    });

    expect(classifyIntentMock).toHaveBeenCalledWith('hello');
    expect(prismaCreate).toHaveBeenCalledWith({
      data: {
        conversationId: 'c1',
        role: 'user',
        content: 'hello',
      },
    });
    expect(result).toEqual({
      userMessageId: 'msg-1',
      intent: 'conversation',
      requiresJson: false,
    });
  });

  it('sets requiresJson to true for recommendation_request intent', async () => {
    classifyIntentMock.mockResolvedValue({ intent: 'recommendation_request', requiredData: [] });

    const result = await prepareStreamContext({
      userId: 'u1',
      conversationId: 'c1',
      userMessage: 'give me a training plan',
    });

    expect(result.requiresJson).toBe(true);
    expect(result.intent).toBe('recommendation_request');
  });
});
