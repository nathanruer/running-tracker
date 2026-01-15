import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConversationMutations } from '../use-conversation-mutations';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

global.fetch = vi.fn();

describe('useConversationMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const mockConversation = { id: 'conv-1', title: 'Nouvelle conversation' };
      const onConversationCreated = vi.fn();

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      } as Response);

      const { result } = renderHook(
        () => useConversationMutations({ onConversationCreated }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.createConversation();
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/conversations',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Nouvelle conversation' }),
        })
      );

      expect(onConversationCreated).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('renameConversation', () => {
    it('should rename a conversation', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'conv-1', title: 'New Title' }),
      } as Response);

      const { result } = renderHook(() => useConversationMutations(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.renameConversation({ id: 'conv-1', title: 'New Title' });
      });

      await waitFor(() => {
        expect(result.current.isRenaming).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1',
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Title' }),
        })
      );
    });

    it('should manage rename dialog state', () => {
      const { result } = renderHook(() => useConversationMutations(), {
        wrapper: createWrapper(),
      });

      const mockConversation = {
        id: 'conv-1',
        title: 'Test Conversation',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        _count: { chat_messages: 5 },
      };

      act(() => {
        result.current.handleRenameClick(mockConversation);
      });

      expect(result.current.renameDialogOpen).toBe(true);
      expect(result.current.selectedForRename).toEqual(mockConversation);
      expect(result.current.newTitle).toBe('Test Conversation');
    });

    it('should cancel rename', () => {
      const { result } = renderHook(() => useConversationMutations(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setRenameDialogOpen(true);
        result.current.setNewTitle('Some title');
      });

      act(() => {
        result.current.handleRenameCancel();
      });

      expect(result.current.renameDialogOpen).toBe(false);
      expect(result.current.selectedForRename).toBe(null);
      expect(result.current.newTitle).toBe('');
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', async () => {
      const onConversationDeleted = vi.fn();

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(
        () => useConversationMutations({ onConversationDeleted }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.deleteConversation('conv-1');
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(onConversationDeleted).toHaveBeenCalledWith('conv-1');
    });
  });
});
