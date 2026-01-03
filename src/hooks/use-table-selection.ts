import { useState } from 'react';

/**
 * Generic hook for managing table row selection
 * Supports both single and multiple selection modes
 *
 * @template T Type of items being selected
 * @param items Array of items available for selection
 * @param mode Selection mode - 'single' allows only one selection, 'multiple' allows many
 * @returns Object with selection state and handlers
 *
 * @example
 * const { selectedIndices, toggleSelect, toggleSelectAll, getSelectedItems } =
 *   useTableSelection(sessions, 'multiple');
 *
 * // In your render:
 * <Checkbox
 *   checked={selectedIndices.has(index)}
 *   onCheckedChange={() => toggleSelect(index)}
 * />
 */
export function useTableSelection<T>(
  items: T[],
  mode: 'single' | 'multiple' = 'multiple'
) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  /**
   * Toggles selection of a specific item by index
   * In single mode, selecting a new item deselects the previous one
   * @param index Index of item to toggle
   */
  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const newSelected = new Set(prev);

      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        if (mode === 'single') {
          newSelected.clear();
        }
        newSelected.add(index);
      }

      return newSelected;
    });
  };

  const toggleSelectAll = () => {
    if (mode === 'single') {
      // toggleSelectAll not supported in single selection mode
      return;
    }

    setSelectedIndices((prev) => {
      if (prev.size === items.length) {
        // All selected - deselect all
        return new Set();
      } else {
        // Not all selected - select all
        return new Set(items.map((_, i) => i));
      }
    });
  };

  const clearSelection = () => {
    setSelectedIndices(new Set());
  };

  const selectIndices = (indices: number[]) => {
    if (mode === 'single' && indices.length > 1) {
      // In single mode, only select first index
      setSelectedIndices(new Set([indices[0]]));
      return;
    }
    setSelectedIndices(new Set(indices));
  };

  const getSelectedItems = (): T[] => {
    return items.filter((_, index) => selectedIndices.has(index));
  };

  const getSelectedIndices = (): number[] => {
    return Array.from(selectedIndices);
  };

  const isSelected = (index: number): boolean => {
    return selectedIndices.has(index);
  };

  const isAllSelected = (): boolean => {
    return selectedIndices.size === items.length && items.length > 0;
  };

  const isSomeSelected = (): boolean => {
    return selectedIndices.size > 0 && selectedIndices.size < items.length;
  };

  return {
    selectedIndices,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectIndices,
    getSelectedItems,
    getSelectedIndices,
    isSelected,
    isAllSelected,
    isSomeSelected,
    selectedCount: selectedIndices.size,
  };
}
