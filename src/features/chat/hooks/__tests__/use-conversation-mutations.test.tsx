import { renderHook, act } from '@testing-library/react';
import { useConversationMutations } from '../use-conversation-mutations';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { deleteConversation, renameConversation, type Conversation } from '@/lib/services/api-client';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
  useMutation: vi.fn((opts) => ({
    mutate: opts.mutationFn,
    isPending: false,
    ...opts
  })),
}));

vi.mock('@/lib/services/api-client', () => ({
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  renameConversation: vi.fn(),
}));

describe('useConversationMutations', () => {
  const mockToast = vi.fn();
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
    cancelQueries: vi.fn(),
    setQueryData: vi.fn(),
    removeQueries: vi.fn(),
    getQueryData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as Mock).mockReturnValue({ toast: mockToast });
    (useQueryClient as Mock).mockReturnValue(mockQueryClient);
  });

  describe('Rename', () => {
    const mockConversation: Conversation = {
      id: 'conv-1',
      title: 'Old Title',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { chat_messages: 0 }
    };

    it('should open rename dialog with current title', () => {
      const { result } = renderHook(() => useConversationMutations({}));
      
      act(() => {
        result.current.handleRenameClick(mockConversation);
      });
      
      expect(result.current.renameDialogOpen).toBe(true);
      expect(result.current.newTitle).toBe('Old Title');
      expect(result.current.selectedForRename).toEqual(mockConversation);
    });

    it('should handle rename submission successfully', async () => {
      const { result } = renderHook(() => useConversationMutations({}));
      (renameConversation as Mock).mockResolvedValue({ id: 'conv-1', title: 'New Title' });
      
      act(() => {
        result.current.handleRenameClick(mockConversation);
      });

      act(() => {
        result.current.setNewTitle('New Title');
      });

      await act(async () => {
        await result.current.handleRenameSubmit();
      });

      
      expect(renameConversation).toHaveBeenCalledWith('conv-1', 'New Title');
    });

    it('should cancel rename', () => {
      const { result } = renderHook(() => useConversationMutations({}));
      
      act(() => {
        result.current.handleRenameClick(mockConversation);
      });
      
      act(() => {
        result.current.handleRenameCancel();
      });

      expect(result.current.renameDialogOpen).toBe(false);
      expect(result.current.newTitle).toBe('');
      expect(result.current.selectedForRename).toBeNull();
    });
  });

  describe('Delete', () => {
    it('should open delete dialog', () => {
      const { result } = renderHook(() => useConversationMutations({}));
      
      act(() => {
        result.current.handleDeleteClick('conv-1');
      });
      
      expect(result.current.deleteDialogOpen).toBe(true);
    });

    it('should handle delete submission successfully', async () => {
      const onDelete = vi.fn();
      const { result } = renderHook(() => useConversationMutations({ onConversationDeleted: onDelete }));
      (deleteConversation as Mock).mockResolvedValue({ success: true });
      
      act(() => {
        result.current.handleDeleteClick('conv-1');
      });

      await act(async () => {
        await result.current.handleDeleteSubmit();
      });

      expect(deleteConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should cancel delete', () => {
      const { result } = renderHook(() => useConversationMutations({}));
      
      act(() => {
        result.current.handleDeleteClick('conv-1');
      });
      
      act(() => {
        result.current.handleDeleteCancel();
      });

      expect(result.current.deleteDialogOpen).toBe(false);
    });
  });
});
