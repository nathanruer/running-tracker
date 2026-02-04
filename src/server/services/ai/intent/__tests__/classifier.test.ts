import { describe, it, expect, vi, beforeEach } from 'vitest';
import { INTENT_DATA_MAP } from '../types';

const mockCreate = vi.fn();

vi.mock('groq-sdk', () => {
  return {
    default: class MockGroq {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('classifyIntent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('GROQ_API_KEY', 'test-api-key');

    const { resetClassifierClient } = await import('../classifier');
    resetClassifierClient();
  });

  it('should classify recommendation request correctly', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'recommendation_request',
              confidence: 0.95,
            }),
          },
        },
      ],
    });

    const { classifyIntent } = await import('../classifier');
    const result = await classifyIntent('Donne-moi une séance pour demain');

    expect(result.intent).toBe('recommendation_request');
    expect(result.requiredData).toBe('full');
    expect(result.confidence).toBe(0.95);
  });

  it('should classify data analysis correctly', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'data_analysis',
              confidence: 0.9,
            }),
          },
        },
      ],
    });

    const { classifyIntent } = await import('../classifier');
    const result = await classifyIntent('Comment évolue ma VMA?');

    expect(result.intent).toBe('data_analysis');
    expect(result.requiredData).toBe('stats');
  });

  it('should classify advice correctly', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'advice',
              confidence: 0.85,
            }),
          },
        },
      ],
    });

    const { classifyIntent } = await import('../classifier');
    const result = await classifyIntent('Suis-je sur la bonne voie?');

    expect(result.intent).toBe('advice');
    expect(result.requiredData).toBe('recent');
  });

  it('should classify greeting correctly', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'greeting',
              confidence: 0.99,
            }),
          },
        },
      ],
    });

    const { classifyIntent } = await import('../classifier');
    const result = await classifyIntent('Bonjour');

    expect(result.intent).toBe('greeting');
    expect(result.requiredData).toBe('none');
  });

  it('should default to discussion for invalid intent', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'invalid_intent',
              confidence: 0.5,
            }),
          },
        },
      ],
    });

    const { classifyIntent } = await import('../classifier');
    const result = await classifyIntent('Random message');

    expect(result.intent).toBe('discussion');
    expect(result.requiredData).toBe(INTENT_DATA_MAP.discussion);
  });

  it('should default to discussion on parse error', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'invalid json',
          },
        },
      ],
    });

    const { classifyIntent } = await import('../classifier');
    const result = await classifyIntent('Test message');

    expect(result.intent).toBe('discussion');
    expect(result.confidence).toBe(0.5);
  });

  it('should clamp confidence to valid range', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'greeting',
              confidence: 1.5,
            }),
          },
        },
      ],
    });

    const { classifyIntent } = await import('../classifier');
    const result = await classifyIntent('Hello');

    expect(result.confidence).toBe(1);
  });
});
