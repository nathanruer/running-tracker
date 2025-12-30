import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getConversations,
  getConversation,
  createConversation,
  renameConversation,
  deleteConversation,
  sendMessage,
} from '@/lib/services/api-client/conversations';
import * as clientModule from '@/lib/services/api-client/client';

vi.mock('@/lib/services/api-client/client', () => ({
  apiRequest: vi.fn(),
}));

describe('Conversations API', () => {
  const mockApiRequest = vi.mocked(clientModule.apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConversations', () => {
    it('fetches all conversations', async () => {
      const mockConversations = [
        { id: 'conv-1', title: 'Conversation 1' },
        { id: 'conv-2', title: 'Conversation 2' },
      ];
      mockApiRequest.mockResolvedValue(mockConversations);

      const result = await getConversations();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/conversations');
      expect(result).toEqual(mockConversations);
    });
  });

  describe('getConversation', () => {
    it('fetches a single conversation with messages', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Conversation',
        chat_messages: [
          { id: 'msg-1', role: 'user', content: 'Hello' },
          { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
        ],
      };
      mockApiRequest.mockResolvedValue(mockConversation);

      const result = await getConversation('conv-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/conversations/conv-1');
      expect(result).toEqual(mockConversation);
    });
  });

  describe('createConversation', () => {
    it('creates a conversation with default title', async () => {
      const mockConversation = { id: 'conv-new', title: 'Nouvelle conversation' };
      mockApiRequest.mockResolvedValue(mockConversation);

      const result = await createConversation();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nouvelle conversation' }),
      });
      expect(result).toEqual(mockConversation);
    });

    it('creates a conversation with custom title', async () => {
      const mockConversation = { id: 'conv-new', title: 'Ma conversation' };
      mockApiRequest.mockResolvedValue(mockConversation);

      const result = await createConversation('Ma conversation');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: 'Ma conversation' }),
      });
      expect(result).toEqual(mockConversation);
    });
  });

  describe('renameConversation', () => {
    it('renames a conversation', async () => {
      const mockConversation = { id: 'conv-1', title: 'New Title' };
      mockApiRequest.mockResolvedValue(mockConversation);

      const result = await renameConversation('conv-1', 'New Title');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/conversations/conv-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title' }),
      });
      expect(result).toEqual(mockConversation);
    });
  });

  describe('deleteConversation', () => {
    it('deletes a conversation', async () => {
      mockApiRequest.mockResolvedValue({});

      await deleteConversation('conv-1');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/conversations/conv-1', {
        method: 'DELETE',
      });
    });
  });

  describe('sendMessage', () => {
    it('sends a message to a conversation', async () => {
      const mockResponse = {
        userMessage: { id: 'msg-1', role: 'user', content: 'Hello' },
        assistantMessage: { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
      };
      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await sendMessage('conv-1', 'Hello');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/conversations/conv-1/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles messages with special characters', async () => {
      const mockResponse = {
        userMessage: { id: 'msg-1', role: 'user', content: 'Séance de côtes' },
        assistantMessage: { id: 'msg-2', role: 'assistant', content: 'Bonne idée!' },
      };
      mockApiRequest.mockResolvedValue(mockResponse);

      await sendMessage('conv-1', 'Séance de côtes');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/conversations/conv-1/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Séance de côtes' }),
      });
    });
  });
});
