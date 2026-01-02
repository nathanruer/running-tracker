import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../[id]/messages/route';
import { prisma } from '@/lib/database';
import * as aiService from '@/lib/services/ai';

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    chat_conversations: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    chat_messages: {
      create: vi.fn(),
    },
    training_sessions: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(() => 'user-123'),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/services/ai', () => ({
  buildSystemPrompt: vi.fn(() => 'System prompt'),
  buildContextMessage: vi.fn(() => 'Context message'),
  getOptimizedConversationHistory: vi.fn(async () => ({ messages: [] })),
  extractJsonFromAI: vi.fn((text) => JSON.parse(text)),
  callGroq: vi.fn(),
  validateAndFixRecommendations: vi.fn((data) => data),
  GROQ_MODEL: 'llama-3.3-70b-versatile',
}));

vi.mock('@/lib/domain/sessions/normalizer', () => ({
  normalizeSessions: vi.fn((sessions) => sessions),
}));

describe('/api/conversations/[id]/messages', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    maxHeartRate: 180,
    vma: 16,
    age: 30,
    goal: 'Améliorer mon endurance',
  };

  const mockConversation = {
    id: 'conv-123',
  };

  const mockSessions = [
    {
      id: 'session-1',
      sessionNumber: 1,
      week: 1,
      status: 'completed',
      date: new Date('2024-01-01'),
    },
    {
      id: 'session-2',
      sessionNumber: 2,
      week: 1,
      status: 'completed',
      date: new Date('2024-01-03'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.chat_conversations.findFirst).mockResolvedValue(mockConversation as never);
    vi.mocked(prisma.training_sessions.findMany).mockResolvedValue(mockSessions as never);
  });

  it('should create user and assistant messages with conversation response', async () => {
    const mockUserMessage = {
      id: 'msg-user-1',
      conversationId: 'conv-123',
      role: 'user',
      content: 'Bonjour, je veux un plan',
    };

    const mockAssistantMessage = {
      id: 'msg-assistant-1',
      conversationId: 'conv-123',
      role: 'assistant',
      content: 'Bonjour! Je vais vous aider.',
      model: 'llama-3.3-70b-versatile',
    };

    const mockAiResponse = {
      responseType: 'conversation' as const,
      message: 'Bonjour! Je vais vous aider.',
    };

    vi.mocked(prisma.chat_messages.create)
      .mockResolvedValueOnce(mockUserMessage as never)
      .mockResolvedValueOnce(mockAssistantMessage as never);

    vi.mocked(aiService.callGroq).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
    } as never);

    vi.mocked(aiService.validateAndFixRecommendations).mockReturnValue(mockAiResponse as never);

    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Bonjour, je veux un plan' }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.userMessage).toEqual(mockUserMessage);
    expect(data.assistantMessage).toEqual(mockAssistantMessage);
    expect(data.response).toEqual(mockAiResponse);

    expect(prisma.chat_messages.create).toHaveBeenCalledTimes(2);
    expect(prisma.chat_conversations.update).toHaveBeenCalledWith({
      where: { id: 'conv-123' },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it('should create messages with recommendations response type', async () => {
    const mockUserMessage = {
      id: 'msg-user-1',
      conversationId: 'conv-123',
      role: 'user',
      content: 'Propose-moi des séances',
    };

    const mockRecommendationsResponse = {
      responseType: 'recommendations' as const,
      message: 'Voici votre plan de semaine',
      week_summary: 'Voici votre plan de semaine',
      rationale: 'Basé sur votre progression',
      sessions: [
        { sessionNumber: 3, sessionType: 'Endurance', duration: 45 },
      ],
    };

    const mockAssistantMessage = {
      id: 'msg-assistant-1',
      conversationId: 'conv-123',
      role: 'assistant',
      content: 'Voici votre plan de semaine',
      recommendations: mockRecommendationsResponse,
      model: 'llama-3.3-70b-versatile',
    };

    vi.mocked(prisma.chat_messages.create)
      .mockResolvedValueOnce(mockUserMessage as never)
      .mockResolvedValueOnce(mockAssistantMessage as never);

    vi.mocked(aiService.callGroq).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockRecommendationsResponse) } }],
    } as never);

    vi.mocked(aiService.validateAndFixRecommendations).mockReturnValue(mockRecommendationsResponse as never);

    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Propose-moi des séances' }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response.responseType).toBe('recommendations');
    expect(prisma.chat_messages.create).toHaveBeenNthCalledWith(2, {
      data: {
        conversationId: 'conv-123',
        role: 'assistant',
        content: 'Voici votre plan de semaine',
        recommendations: mockRecommendationsResponse,
        model: 'llama-3.3-70b-versatile',
      },
    });
  });

  it('should return 400 when content is missing', async () => {
    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 400 when content is not a string', async () => {
    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 123 }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 404 when user is not found', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test message' }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Utilisateur non trouvé' });
  });

  it('should return 404 when conversation is not found', async () => {
    vi.mocked(prisma.chat_conversations.findFirst).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test message' }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Conversation non trouvée' });
  });

  it('should handle Groq rate limit error (429)', async () => {
    const mockUserMessage = {
      id: 'msg-user-1',
      conversationId: 'conv-123',
      role: 'user',
      content: 'Test message',
    };

    const mockQuotaMessage = {
      id: 'msg-assistant-1',
      conversationId: 'conv-123',
      role: 'assistant',
      content: 'Quota de tokens atteint. Veuillez réessayer plus tard.',
      model: 'llama-3.3-70b-versatile',
    };

    vi.mocked(prisma.chat_messages.create)
      .mockResolvedValueOnce(mockUserMessage as never)
      .mockResolvedValueOnce(mockQuotaMessage as never);

    const error = new Error('Rate limit exceeded');
    (error as never as { status: number }).status = 429;
    vi.mocked(aiService.callGroq).mockRejectedValue(error);

    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test message' }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assistantMessage.content).toContain('Quota de tokens atteint');
  });

  it('should call AI service with correct context', async () => {
    const mockUserMessage = {
      id: 'msg-user-1',
      conversationId: 'conv-123',
      role: 'user',
      content: 'Test message',
    };

    const mockAssistantMessage = {
      id: 'msg-assistant-1',
      conversationId: 'conv-123',
      role: 'assistant',
      content: 'Response',
      model: 'llama-3.3-70b-versatile',
    };

    vi.mocked(prisma.chat_messages.create)
      .mockResolvedValueOnce(mockUserMessage as never)
      .mockResolvedValueOnce(mockAssistantMessage as never);

    vi.mocked(aiService.callGroq).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ responseType: 'conversation', message: 'Response' }) } }],
    } as never);

    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test message' }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    await POST(request, { params });

    expect(aiService.buildSystemPrompt).toHaveBeenCalled();
    expect(aiService.buildContextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfile: expect.objectContaining({
          maxHeartRate: 180,
          vma: 16,
          age: 30,
          goal: 'Améliorer mon endurance',
        }),
        nextSessionNumber: expect.any(Number),
      })
    );
    expect(aiService.getOptimizedConversationHistory).toHaveBeenCalledWith('conv-123');
  });

  it('should calculate next session number correctly', async () => {
    const mockUserMessage = { id: 'msg-1', conversationId: 'conv-123', role: 'user', content: 'Test' };
    const mockAssistantMessage = { id: 'msg-2', conversationId: 'conv-123', role: 'assistant', content: 'Response' };

    vi.mocked(prisma.chat_messages.create)
      .mockResolvedValueOnce(mockUserMessage as never)
      .mockResolvedValueOnce(mockAssistantMessage as never);

    vi.mocked(aiService.callGroq).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ responseType: 'conversation', message: 'Response' }) } }],
    } as never);

    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test' }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    await POST(request, { params });

    expect(aiService.buildContextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        nextSessionNumber: expect.any(Number),
      })
    );
  });

  it('should handle empty sessions gracefully', async () => {
    vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([]);

    const mockUserMessage = { id: 'msg-1', conversationId: 'conv-123', role: 'user', content: 'Test' };
    const mockAssistantMessage = { id: 'msg-2', conversationId: 'conv-123', role: 'assistant', content: 'Response' };

    vi.mocked(prisma.chat_messages.create)
      .mockResolvedValueOnce(mockUserMessage as never)
      .mockResolvedValueOnce(mockAssistantMessage as never);

    vi.mocked(aiService.callGroq).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ responseType: 'conversation', message: 'Response' }) } }],
    } as never);

    const request = new NextRequest('http://localhost/api/conversations/conv-123/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test' }),
    });

    const params = Promise.resolve({ id: 'conv-123' });
    const response = await POST(request, { params });

    expect(response.status).toBe(200);
    expect(aiService.buildContextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        nextSessionNumber: 1,
      })
    );
  });
});
