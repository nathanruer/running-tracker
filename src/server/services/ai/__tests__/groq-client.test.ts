import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callGroq, callGroqText, collectStreamedResponse, resetGroqClient } from '../groq-client';

const createMock = vi.fn();

vi.mock('groq-sdk', () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: createMock,
      },
    };
    constructor() {}
  },
}));

describe('groq-client', () => {
  const originalEnv = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    resetGroqClient();
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalEnv;
  });

  it('throws when GROQ_API_KEY is missing', async () => {
    process.env.GROQ_API_KEY = '';
    await expect(callGroq([])).rejects.toThrow('Clé API Groq manquante');
  });

  it('calls Groq with json response format', async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
    await callGroq([{ role: 'user', content: 'Hello' }]);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: 'json_object' },
      })
    );
  });

  it('calls Groq without json response format for text', async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    await callGroqText([{ role: 'user', content: 'Hi' }]);

    expect(createMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        response_format: { type: 'json_object' },
      })
    );
  });

  it('collects streamed response', async () => {
    createMock.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: 'A' } }] };
        yield { choices: [{ delta: { content: 'B' } }] };
      },
    });

    const result = await collectStreamedResponse([{ role: 'user', content: 'Hi' }]);
    expect(result).toBe('AB');
  });
});
