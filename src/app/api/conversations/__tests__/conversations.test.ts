import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  prisma: {
    chat_conversations: {
      findMany: vi.fn(),
      create: vi.fn(),
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

describe('/api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return all conversations for authenticated user', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Première conversation',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          _count: { chat_messages: 5 },
        },
        {
          id: 'conv-2',
          title: 'Deuxième conversation',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
          _count: { chat_messages: 10 },
        },
      ];

      vi.mocked(prisma.chat_conversations.findMany).mockResolvedValue(mockConversations as never);

      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('conv-1');
      expect(data[1].id).toBe('conv-2');
      expect(prisma.chat_conversations.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { chat_messages: true },
          },
        },
      });
    });

    it('should return empty array when user has no conversations', async () => {
      vi.mocked(prisma.chat_conversations.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should order conversations by updatedAt desc', async () => {
      vi.mocked(prisma.chat_conversations.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'GET',
      });

      await GET(request);

      expect(prisma.chat_conversations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.chat_conversations.findMany).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });

  describe('POST', () => {
    it('should create new conversation with valid title', async () => {
      const mockConversation = {
        id: 'new-conv',
        title: 'Nouvelle conversation',
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.chat_conversations.create).mockResolvedValue(mockConversation as never);

      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nouvelle conversation' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: mockConversation.id,
        title: mockConversation.title,
        userId: mockConversation.userId,
      });
      expect(prisma.chat_conversations.create).toHaveBeenCalledWith({
        data: {
          title: 'Nouvelle conversation',
          userId: 'user-123',
        },
      });
    });

    it('should return 400 when title is missing', async () => {
      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Titre invalide' });
    });

    it('should return 400 when title is not a string', async () => {
      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: 123 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Titre invalide' });
    });

    it('should return 400 when title is empty string', async () => {
      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Titre invalide' });
    });

    it('should handle database errors during creation', async () => {
      vi.mocked(prisma.chat_conversations.create).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test conversation' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });

    it('should trim whitespace from title', async () => {
      const mockConversation = {
        id: 'new-conv',
        title: '  Spaced title  ',
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.chat_conversations.create).mockResolvedValue(mockConversation as never);

      const request = new NextRequest('http://localhost/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: '  Spaced title  ' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.chat_conversations.create).toHaveBeenCalled();
    });
  });
});
