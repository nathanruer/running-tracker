import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useBulkDelete } from '../use-bulk-delete';

describe('useBulkDelete', () => {
  describe('initialization', () => {
    it('should initialize with dialog closed and not deleting', () => {
      const mockOnBulkDelete = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      expect(result.current.showBulkDeleteDialog).toBe(false);
      expect(result.current.isDeletingBulk).toBe(false);
    });
  });

  describe('setShowBulkDeleteDialog', () => {
    it('should update showBulkDeleteDialog state', () => {
      const mockOnBulkDelete = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      act(() => {
        result.current.setShowBulkDeleteDialog(true);
      });
      
      expect(result.current.showBulkDeleteDialog).toBe(true);
      
      act(() => {
        result.current.setShowBulkDeleteDialog(false);
      });
      
      expect(result.current.showBulkDeleteDialog).toBe(false);
    });
  });

  describe('handleBulkDelete', () => {
    it('should call onBulkDelete with selected session IDs', async () => {
      const mockOnBulkDelete = vi.fn().mockResolvedValue(undefined);
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      const sessionIds = ['1', '2', '3'];
      
      await act(async () => {
        await result.current.handleBulkDelete(sessionIds, mockClearSelection);
      });
      
      expect(mockOnBulkDelete).toHaveBeenCalledWith(sessionIds);
      expect(mockOnBulkDelete).toHaveBeenCalledTimes(1);
    });

    it('should clear selection after successful delete', async () => {
      const mockOnBulkDelete = vi.fn().mockResolvedValue(undefined);
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      const sessionIds = ['1', '2'];
      
      await act(async () => {
        await result.current.handleBulkDelete(sessionIds, mockClearSelection);
      });
      
      expect(mockClearSelection).toHaveBeenCalledTimes(1);
    });

    it('should close dialog after successful delete', async () => {
      const mockOnBulkDelete = vi.fn().mockResolvedValue(undefined);
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      act(() => {
        result.current.setShowBulkDeleteDialog(true);
      });
      
      expect(result.current.showBulkDeleteDialog).toBe(true);
      
      const sessionIds = ['1'];
      
      await act(async () => {
        await result.current.handleBulkDelete(sessionIds, mockClearSelection);
      });
      
      await waitFor(() => {
        expect(result.current.showBulkDeleteDialog).toBe(false);
      });
    });

    it('should set isDeletingBulk to true during delete', async () => {
      const mockOnBulkDelete = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      const sessionIds = ['1'];
      
      act(() => {
        result.current.handleBulkDelete(sessionIds, mockClearSelection);
      });
      
      expect(result.current.isDeletingBulk).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isDeletingBulk).toBe(false);
      });
    });

    it('should set isDeletingBulk to false after delete completes', async () => {
      const mockOnBulkDelete = vi.fn().mockResolvedValue(undefined);
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      const sessionIds = ['1'];
      
      await act(async () => {
        await result.current.handleBulkDelete(sessionIds, mockClearSelection);
      });
      
      expect(result.current.isDeletingBulk).toBe(false);
    });

    it('should handle delete errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockOnBulkDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      const sessionIds = ['1'];
      
      await act(async () => {
        await result.current.handleBulkDelete(sessionIds, mockClearSelection);
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting sessions:', expect.any(Error));
      expect(result.current.isDeletingBulk).toBe(false);
      // Should not clear selection on error
      expect(mockClearSelection).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should set isDeletingBulk to false even on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockOnBulkDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));
      
      const sessionIds = ['1'];
      
      await act(async () => {
        await result.current.handleBulkDelete(sessionIds, mockClearSelection);
      });
      
      expect(result.current.isDeletingBulk).toBe(false);
      
      consoleErrorSpy.mockRestore();
    });
  });
});


