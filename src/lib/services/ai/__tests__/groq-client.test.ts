import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callGroq, GROQ_MODEL, GROQ_MAX_TOKENS, GROQ_TEMPERATURE } from '../groq-client';

const mockCreate = vi.fn();

vi.mock('groq-sdk', () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

describe('callGroq', () => {
  const originalEnv = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalEnv;
  });

  it('should throw error when GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY;

    await expect(callGroq([])).rejects.toThrow('Clé API Groq manquante');
  });

  it('should call Groq API with correct parameters', async () => {
    const mockResponse = {
      id: 'completion-123',
      choices: [{ message: { content: '{"responseType":"conversation"}' } }],
    };
    mockCreate.mockResolvedValue(mockResponse);

    const messages = [{ role: 'user' as const, content: 'Hello' }];
    const result = await callGroq(messages);

    expect(mockCreate).toHaveBeenCalledWith({
      messages,
      model: GROQ_MODEL,
      temperature: GROQ_TEMPERATURE,
      max_tokens: GROQ_MAX_TOKENS,
      response_format: { type: 'json_object' },
    });
    expect(result).toEqual(mockResponse);
  });

  it('should pass multiple messages to the API', async () => {
    const mockResponse = {
      id: 'completion-456',
      choices: [{ message: { content: '{"responseType":"recommendations"}' } }],
    };
    mockCreate.mockResolvedValue(mockResponse);

    const messages = [
      { role: 'system' as const, content: 'You are a helpful assistant' },
      { role: 'user' as const, content: 'Give me recommendations' },
      { role: 'assistant' as const, content: 'Here are my suggestions' },
    ];
    await callGroq(messages);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ messages })
    );
  });

  it('should propagate API errors', async () => {
    const apiError = new Error('Rate limit exceeded');
    mockCreate.mockRejectedValue(apiError);

    await expect(callGroq([{ role: 'user', content: 'test' }])).rejects.toThrow(
      'Rate limit exceeded'
    );
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network error');
    mockCreate.mockRejectedValue(networkError);

    await expect(callGroq([{ role: 'user', content: 'test' }])).rejects.toThrow(
      'Network error'
    );
  });
});

describe('constants', () => {
  it('should export correct model', () => {
    expect(GROQ_MODEL).toBe('openai/gpt-oss-120b');
  });

  it('should export correct max tokens', () => {
    expect(GROQ_MAX_TOKENS).toBe(12000);
  });

  it('should export correct temperature', () => {
    expect(GROQ_TEMPERATURE).toBe(0.7);
  });
});
