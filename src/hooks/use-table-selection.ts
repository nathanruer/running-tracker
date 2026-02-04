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
type SelectionMode = 'single' | 'multiple';
type SelectionKey = string | number;
type KeyGetter<T, K extends SelectionKey> = (item: T, index: number) => K;
type UseTableSelectionOptions<T, K extends SelectionKey> = {
  mode?: SelectionMode;
  getKey?: KeyGetter<T, K>;
};

export function useTableSelection<T, K extends SelectionKey = number>(
  items: T[],
  modeOrOptions: SelectionMode | UseTableSelectionOptions<T, K> = 'multiple'
) {
  const options = typeof modeOrOptions === 'string' ? { mode: modeOrOptions } : modeOrOptions;
  const mode = options?.mode ?? 'multiple';
  const getKey: KeyGetter<T, K> =
    options?.getKey ?? ((_: T, index: number) => index as unknown as K);

  const [selectedKeys, setSelectedKeys] = useState<Set<K>>(new Set());

  const getKeyForIndex = (index: number): K => {
    const item = items[index];
    if (item === undefined) {
      return index as unknown as K;
    }
    return getKey(item, index);
  };

  /**
   * Toggles selection of a specific item by index
   * In single mode, selecting a new item deselects the previous one
   * @param index Index of item to toggle
   */
  const toggleSelect = (index: number) => {
    const key = getKeyForIndex(index);
    setSelectedKeys((prev) => {
      const newSelected = new Set(prev);

      if (newSelected.has(key)) {
        newSelected.delete(key);
      } else {
        if (mode === 'single') {
          newSelected.clear();
        }
        newSelected.add(key);
      }

      return newSelected;
    });
  };

  const toggleSelectByKey = (key: K) => {
    setSelectedKeys((prev) => {
      const newSelected = new Set(prev);

      if (newSelected.has(key)) {
        newSelected.delete(key);
      } else {
        if (mode === 'single') {
          newSelected.clear();
        }
        newSelected.add(key);
      }

      return newSelected;
    });
  };

  const toggleSelectAll = () => {
    if (mode === 'single') {
      return;
    }

    setSelectedKeys((prev) => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map(getKey));
    });
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
  };

  const selectIndices = (indices: number[]) => {
    if (mode === 'single' && indices.length > 1) {
      setSelectedKeys(new Set([getKeyForIndex(indices[0])]));
      return;
    }
    setSelectedKeys(new Set(indices.map(getKeyForIndex)));
  };

  const selectKeys = (keys: K[]) => {
    if (mode === 'single' && keys.length > 1) {
      setSelectedKeys(new Set([keys[0]]));
      return;
    }
    setSelectedKeys(new Set(keys));
  };

  const getSelectedItems = (): T[] => {
    return items.filter((item, index) => selectedKeys.has(getKey(item, index)));
  };

  const getSelectedIndices = (): number[] => {
    return Array.from(selectedIndices);
  };

  const isSelected = (index: number): boolean => {
    return selectedKeys.has(getKeyForIndex(index));
  };

  const isSelectedByKey = (key: K): boolean => {
    return selectedKeys.has(key);
  };

  const getSelectedKeys = (): K[] => {
    return Array.from(selectedKeys);
  };

  const selectedIndices = new Set<number>();
  items.forEach((item, index) => {
    if (selectedKeys.has(getKey(item, index))) {
      selectedIndices.add(index);
    }
  });

  const isAllSelected = (): boolean => {
    return selectedIndices.size === items.length && items.length > 0;
  };

  const isSomeSelected = (): boolean => {
    return selectedIndices.size > 0 && selectedIndices.size < items.length;
  };

  return {
    selectedKeys,
    selectedIndices,
    toggleSelect,
    toggleSelectByKey,
    toggleSelectAll,
    clearSelection,
    selectIndices,
    selectKeys,
    getSelectedItems,
    getSelectedIndices,
    getSelectedKeys,
    isSelected,
    isSelectedByKey,
    isAllSelected,
    isSomeSelected,
    selectedCount: selectedKeys.size,
  };
}
