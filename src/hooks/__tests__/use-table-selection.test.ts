import { renderHook, act } from '@testing-library/react';
import { useTableSelection } from '../use-table-selection';

describe('useTableSelection', () => {
  const testItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
    { id: 4, name: 'Item 4' },
  ];

  describe('Multiple selection mode', () => {
    it('should initialize with empty selection', () => {
      const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected()).toBe(false);
      expect(result.current.isSomeSelected()).toBe(false);
    });

    describe('toggleSelect', () => {
      it('should select an item when toggled', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(1);
        });
        
        expect(result.current.isSelected(1)).toBe(true);
        expect(result.current.selectedCount).toBe(1);
      });

      it('should deselect an item when toggled twice', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(1);
        });
        expect(result.current.isSelected(1)).toBe(true);
        
        act(() => {
          result.current.toggleSelect(1);
        });
        expect(result.current.isSelected(1)).toBe(false);
        expect(result.current.selectedCount).toBe(0);
      });

      it('should allow multiple selections', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(0);
          result.current.toggleSelect(2);
        });
        
        expect(result.current.isSelected(0)).toBe(true);
        expect(result.current.isSelected(1)).toBe(false);
        expect(result.current.isSelected(2)).toBe(true);
        expect(result.current.selectedCount).toBe(2);
      });
    });

    describe('toggleSelectAll', () => {
      it('should select all items when none are selected', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelectAll();
        });
        
        expect(result.current.isAllSelected()).toBe(true);
        expect(result.current.selectedCount).toBe(4);
        expect(result.current.isSomeSelected()).toBe(false);
      });

      it('should deselect all items when all are selected', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelectAll();
        });
        expect(result.current.isAllSelected()).toBe(true);
        
        act(() => {
          result.current.toggleSelectAll();
        });
        expect(result.current.isAllSelected()).toBe(false);
        expect(result.current.selectedCount).toBe(0);
      });

      it('should select all items when some are selected', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(0);
          result.current.toggleSelect(2);
        });
        expect(result.current.isSomeSelected()).toBe(true);
        
        act(() => {
          result.current.toggleSelectAll();
        });
        expect(result.current.isAllSelected()).toBe(true);
        expect(result.current.selectedCount).toBe(4);
      });
    });

    describe('clearSelection', () => {
      it('should clear all selections', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(0);
          result.current.toggleSelect(1);
          result.current.toggleSelect(2);
        });
        expect(result.current.selectedCount).toBe(3);
        
        act(() => {
          result.current.clearSelection();
        });
        expect(result.current.selectedCount).toBe(0);
        expect(result.current.isAllSelected()).toBe(false);
      });
    });

    describe('selectIndices', () => {
      it('should select specific indices', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.selectIndices([0, 2]);
        });
        
        expect(result.current.isSelected(0)).toBe(true);
        expect(result.current.isSelected(1)).toBe(false);
        expect(result.current.isSelected(2)).toBe(true);
        expect(result.current.selectedCount).toBe(2);
      });

      it('should replace existing selection', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(1);
        });
        expect(result.current.isSelected(1)).toBe(true);
        
        act(() => {
          result.current.selectIndices([0, 2]);
        });
        
        expect(result.current.isSelected(0)).toBe(true);
        expect(result.current.isSelected(1)).toBe(false);
        expect(result.current.isSelected(2)).toBe(true);
      });
    });

    describe('getSelectedItems', () => {
      it('should return selected items', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(1);
          result.current.toggleSelect(3);
        });
        
        const selectedItems = result.current.getSelectedItems();
        expect(selectedItems.length).toBe(2);
        expect(selectedItems).toEqual([
          { id: 2, name: 'Item 2' },
          { id: 4, name: 'Item 4' },
        ]);
      });

      it('should return empty array when no items are selected', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        const selectedItems = result.current.getSelectedItems();
        expect(selectedItems).toEqual([]);
      });
    });

    describe('getSelectedIndices', () => {
      it('should return selected indices as array', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(0);
          result.current.toggleSelect(2);
        });
        
        const selectedIndices = result.current.getSelectedIndices();
        expect(selectedIndices).toEqual([0, 2]);
      });
    });

    describe('isSomeSelected', () => {
      it('should return true when some but not all items are selected', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelect(0);
          result.current.toggleSelect(1);
        });
        
        expect(result.current.isSomeSelected()).toBe(true);
        expect(result.current.isAllSelected()).toBe(false);
      });

      it('should return false when no items are selected', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        expect(result.current.isSomeSelected()).toBe(false);
      });

      it('should return false when all items are selected', () => {
        const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
        
        act(() => {
          result.current.toggleSelectAll();
        });
        
        expect(result.current.isSomeSelected()).toBe(false);
        expect(result.current.isAllSelected()).toBe(true);
      });
    });
  });

  describe('Single selection mode', () => {
    it('should initialize with empty selection', () => {
      const { result } = renderHook(() => useTableSelection(testItems, 'single'));
      expect(result.current.selectedCount).toBe(0);
    });

    it('should only allow one selection at a time', () => {
      const { result } = renderHook(() => useTableSelection(testItems, 'single'));
      
      act(() => {
        result.current.toggleSelect(0);
      });
      expect(result.current.isSelected(0)).toBe(true);
      expect(result.current.selectedCount).toBe(1);
      
      act(() => {
        result.current.toggleSelect(1);
      });
      expect(result.current.isSelected(0)).toBe(false);
      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should deselect when clicking the same item twice', () => {
      const { result } = renderHook(() => useTableSelection(testItems, 'single'));
      
      act(() => {
        result.current.toggleSelect(0);
      });
      expect(result.current.isSelected(0)).toBe(true);
      
      act(() => {
        result.current.toggleSelect(0);
      });
      expect(result.current.isSelected(0)).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should select only first index when trying to select multiple indices', () => {
      const { result } = renderHook(() => useTableSelection(testItems, 'single'));

      act(() => {
        result.current.selectIndices([0, 1, 2]);
      });

      // In single mode, only first index should be selected
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.getSelectedItems()).toEqual([testItems[0]]);
    });

    it('should not select all when trying to toggleSelectAll in single mode', () => {
      const { result } = renderHook(() => useTableSelection(testItems, 'single'));

      act(() => {
        result.current.toggleSelectAll();
      });

      // toggleSelectAll not supported in single mode
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty items array', () => {
      const { result } = renderHook(() => useTableSelection([], 'multiple'));
      
      act(() => {
        result.current.toggleSelectAll();
      });
      
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected()).toBe(false);
    });

    it('should handle out of bounds indices', () => {
      const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
      
      act(() => {
        result.current.toggleSelect(10);
      });
      
      expect(result.current.selectedCount).toBe(1);
      
      const selectedItems = result.current.getSelectedItems();
      expect(selectedItems).toEqual([]);
    });

    it('should handle negative indices', () => {
      const { result } = renderHook(() => useTableSelection(testItems, 'multiple'));
      
      act(() => {
        result.current.toggleSelect(-1);
      });
      
      expect(result.current.selectedCount).toBe(1);
      
      const selectedItems = result.current.getSelectedItems();
      expect(selectedItems).toEqual([]);
    });
  });
});