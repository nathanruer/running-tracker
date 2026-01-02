import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../[id]/route';
import { prisma } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  prisma: {
    chat_conversations: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
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

describe('/api/conversations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return conversation with messages', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Ma conversation',
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        chat_messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Bonjour',
            createdAt: new Date(),
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Bonjour! Comment puis-je vous aider?',
            createdAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.chat_conversations.findFirst).mockResolvedValue(mockConversation as never);

      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'GET',
      });

      const params = Promise.resolve({ id: 'conv-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: mockConversation.id,
        title: mockConversation.title,
        userId: mockConversation.userId,
      });
      expect(data.chat_messages).toHaveLength(2);
      expect(prisma.chat_conversations.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'conv-123',
          userId: 'user-123',
        },
        include: {
          chat_messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    it('should return 404 when conversation not found', async () => {
      vi.mocked(prisma.chat_conversations.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/conversations/nonexistent', {
        method: 'GET',
      });

      const params = Promise.resolve({ id: 'nonexistent' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Conversation non trouvée' });
    });

    it('should return 404 when conversation belongs to another user', async () => {
      vi.mocked(prisma.chat_conversations.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/conversations/other-user-conv', {
        method: 'GET',
      });

      const params = Promise.resolve({ id: 'other-user-conv' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Conversation non trouvée' });
    });

    it('should order messages by createdAt ascending', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Test',
        userId: 'user-123',
        chat_messages: [],
      };

      vi.mocked(prisma.chat_conversations.findFirst).mockResolvedValue(mockConversation as never);

      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'GET',
      });

      const params = Promise.resolve({ id: 'conv-123' });
      await GET(request, { params });

      expect(prisma.chat_conversations.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            chat_messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.chat_conversations.findFirst).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'GET',
      });

      const params = Promise.resolve({ id: 'conv-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });

  describe('PATCH', () => {
    it('should update conversation title', async () => {
      vi.mocked(prisma.chat_conversations.updateMany).mockResolvedValue({ count: 1 } as never);

      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Nouveau titre' }),
      });

      const params = Promise.resolve({ id: 'conv-123' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.chat_conversations.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'conv-123',
          userId: 'user-123',
        },
        data: { title: 'Nouveau titre' },
      });
    });

    it('should return 404 when conversation not found', async () => {
      vi.mocked(prisma.chat_conversations.updateMany).mockResolvedValue({ count: 0 } as never);

      const request = new NextRequest('http://localhost/api/conversations/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Nouveau titre' }),
      });

      const params = Promise.resolve({ id: 'nonexistent' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Conversation non trouvée' });
    });

    it('should return 400 when title is missing', async () => {
      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ id: 'conv-123' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Titre invalide' });
    });

    it('should return 400 when title is not a string', async () => {
      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 123 }),
      });

      const params = Promise.resolve({ id: 'conv-123' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Titre invalide' });
    });

    it('should return 400 when title is empty', async () => {
      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'PATCH',
        body: JSON.stringify({ title: '' }),
      });

      const params = Promise.resolve({ id: 'conv-123' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Titre invalide' });
    });
  });

  describe('DELETE', () => {
    it('should delete conversation', async () => {
      vi.mocked(prisma.chat_conversations.deleteMany).mockResolvedValue({ count: 1 } as never);

      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'conv-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.chat_conversations.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'conv-123',
          userId: 'user-123',
        },
      });
    });

    it('should return 404 when conversation not found', async () => {
      vi.mocked(prisma.chat_conversations.deleteMany).mockResolvedValue({ count: 0 } as never);

      const request = new NextRequest('http://localhost/api/conversations/nonexistent', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'nonexistent' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Conversation non trouvée' });
    });

    it('should not delete conversation belonging to another user', async () => {
      vi.mocked(prisma.chat_conversations.deleteMany).mockResolvedValue({ count: 0 } as never);

      const request = new NextRequest('http://localhost/api/conversations/other-user-conv', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'other-user-conv' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Conversation non trouvée' });
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.chat_conversations.deleteMany).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost/api/conversations/conv-123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'conv-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });
});
