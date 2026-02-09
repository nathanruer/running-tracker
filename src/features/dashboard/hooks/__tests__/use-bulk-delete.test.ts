import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useBulkDelete } from '../use-bulk-delete';

describe('useBulkDelete', () => {
  describe('initialization', () => {
    it('should initialize with dialog closed', () => {
      const mockOnBulkDelete = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));

      expect(result.current.showBulkDeleteDialog).toBe(false);
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

      act(() => {
        result.current.handleBulkDelete(sessionIds, mockClearSelection);
      });

      expect(mockOnBulkDelete).toHaveBeenCalledWith(sessionIds);
      expect(mockOnBulkDelete).toHaveBeenCalledTimes(1);
    });

    it('should close dialog immediately on confirm', () => {
      const mockOnBulkDelete = vi.fn().mockReturnValue(new Promise(() => {}));
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));

      act(() => {
        result.current.setShowBulkDeleteDialog(true);
      });

      expect(result.current.showBulkDeleteDialog).toBe(true);

      act(() => {
        result.current.handleBulkDelete(['1'], mockClearSelection);
      });

      expect(result.current.showBulkDeleteDialog).toBe(false);
    });

    it('should clear selection after successful delete', async () => {
      const mockOnBulkDelete = vi.fn().mockResolvedValue(undefined);
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));

      act(() => {
        result.current.handleBulkDelete(['1', '2'], mockClearSelection);
      });

      await vi.waitFor(() => {
        expect(mockClearSelection).toHaveBeenCalledTimes(1);
      });
    });

    it('should not clear selection on delete error', async () => {
      const mockOnBulkDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));
      const mockClearSelection = vi.fn();
      const { result } = renderHook(() => useBulkDelete(mockOnBulkDelete));

      act(() => {
        result.current.handleBulkDelete(['1'], mockClearSelection);
      });

      await vi.waitFor(() => {
        expect(mockOnBulkDelete).toHaveBeenCalled();
      });

      expect(mockClearSelection).not.toHaveBeenCalled();
    });
  });
});
