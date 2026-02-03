import { renderHook, act } from '@testing-library/react';
import { useConversationMutations } from '../use-conversation-mutations';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
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
    (useMutation as Mock).mockClear();
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

  describe('Mutation callbacks', () => {
    it('should call onConversationCreated on create success', () => {
      const onCreated = vi.fn();
      renderHook(() => useConversationMutations({ onConversationCreated: onCreated }));

      const createMutationOptions = (useMutation as Mock).mock.calls[0][0];
      createMutationOptions.onSuccess?.({ id: 'conv-1' });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
      expect(onCreated).toHaveBeenCalledWith('conv-1');
    });

    it('should toast on create error', () => {
      renderHook(() => useConversationMutations({}));

      const createMutationOptions = (useMutation as Mock).mock.calls[0][0];
      createMutationOptions.onError?.();

      expect(mockToast).toHaveBeenCalled();
    });

    it('should toast on rename error', () => {
      renderHook(() => useConversationMutations({}));

      const renameMutationOptions = (useMutation as Mock).mock.calls[1][0];
      renameMutationOptions.onError?.();

      expect(mockToast).toHaveBeenCalled();
    });

    it('should optimistically remove conversation on delete mutate', async () => {
      const onDeleted = vi.fn();
      (mockQueryClient.getQueryData as Mock).mockReturnValue([
        { id: 'conv-1', title: 'Title' },
        { id: 'conv-2', title: 'Title 2' },
      ]);

      renderHook(() => useConversationMutations({ onConversationDeleted: onDeleted }));

      const deleteMutationOptions = (useMutation as Mock).mock.calls[2][0];
      await deleteMutationOptions.onMutate?.('conv-1');

      expect(mockQueryClient.setQueryData).toHaveBeenCalled();
      expect(mockQueryClient.removeQueries).toHaveBeenCalled();
      expect(onDeleted).toHaveBeenCalledWith('conv-1');
    });

    it('should rollback on delete error', () => {
      renderHook(() => useConversationMutations({}));

      const deleteMutationOptions = (useMutation as Mock).mock.calls[2][0];
      deleteMutationOptions.onError?.(new Error('fail'), 'conv-1', { previousConversations: [] });

      expect(mockQueryClient.setQueryData).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalled();
    });

    it('should reset rename dialog state on success', () => {
      const { result } = renderHook(() => useConversationMutations({}));

      const mockConversation: Conversation = {
        id: 'conv-1',
        title: 'Old Title',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { chat_messages: 0 }
      };

      act(() => {
        result.current.handleRenameClick(mockConversation);
      });

      expect(result.current.renameDialogOpen).toBe(true);

      const renameMutationOptions = (useMutation as Mock).mock.calls[1][0];
      renameMutationOptions.onSuccess?.({}, { id: 'conv-1', title: 'New Title' });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['conversations']) });
    });

    it('should use setQueryData filter function correctly for delete', async () => {
      const conversations: Conversation[] = [
        { id: 'conv-1', title: 'Title 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'conv-2', title: 'Title 2', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];
      (mockQueryClient.getQueryData as Mock).mockReturnValue(conversations);

      let capturedFilterFn: ((old: Conversation[] | undefined) => Conversation[]) | undefined;
      (mockQueryClient.setQueryData as Mock).mockImplementation((_key, fn) => {
        if (typeof fn === 'function') {
          capturedFilterFn = fn as (old: Conversation[] | undefined) => Conversation[];
        }
      });

      renderHook(() => useConversationMutations({}));

      const deleteMutationOptions = (useMutation as Mock).mock.calls[2][0];
      await deleteMutationOptions.onMutate?.('conv-1');

      expect(capturedFilterFn).toBeDefined();
      const filtered = capturedFilterFn!(conversations);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('conv-2');

      const emptyFiltered = capturedFilterFn!(undefined);
      expect(emptyFiltered).toEqual([]);
    });

    it('should execute createConversation mutationFn', async () => {
      const { createConversation } = await import('@/lib/services/api-client');
      (createConversation as Mock).mockResolvedValue({ id: 'new-conv-1', title: 'Nouvelle conversation' });

      renderHook(() => useConversationMutations({}));

      const createMutationOptions = (useMutation as Mock).mock.calls[0][0];
      await createMutationOptions.mutationFn();

      expect(createConversation).toHaveBeenCalled();
    });
  });

  describe('handleRenameSubmit edge cases', () => {
    it('should not submit rename when selectedForRename is null', () => {
      const { result } = renderHook(() => useConversationMutations({}));

      act(() => {
        result.current.handleRenameSubmit();
      });

      expect(renameConversation).not.toHaveBeenCalled();
    });

    it('should not submit rename when newTitle is empty', () => {
      const { result } = renderHook(() => useConversationMutations({}));

      const mockConversation: Conversation = {
        id: 'conv-1',
        title: 'Old Title',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { chat_messages: 0 }
      };

      act(() => {
        result.current.handleRenameClick(mockConversation);
      });

      act(() => {
        result.current.setNewTitle('   ');
      });

      act(() => {
        result.current.handleRenameSubmit();
      });

      expect(renameConversation).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteSubmit edge cases', () => {
    it('should not submit delete when selectedForDelete is null', () => {
      const { result } = renderHook(() => useConversationMutations({}));

      act(() => {
        result.current.handleDeleteSubmit();
      });

      expect(deleteConversation).not.toHaveBeenCalled();
    });
  });
});
