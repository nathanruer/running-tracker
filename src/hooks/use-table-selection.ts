import { useState, useRef, useCallback } from 'react';

type SelectionMode = 'single' | 'multiple';
type SelectionKey = string | number;
type KeyGetter<T, K extends SelectionKey> = (item: T, index: number) => K;
type UseTableSelectionOptions<T, K extends SelectionKey> = {
  mode?: SelectionMode;
  getKey?: KeyGetter<T, K>;
  disabledKeys?: Set<K>;
};

export function useTableSelection<T, K extends SelectionKey = number>(
  items: T[],
  modeOrOptions: SelectionMode | UseTableSelectionOptions<T, K> = 'multiple'
) {
  const options = typeof modeOrOptions === 'string' ? { mode: modeOrOptions } : modeOrOptions;
  const mode = options?.mode ?? 'multiple';
  const getKey: KeyGetter<T, K> =
    options?.getKey ?? ((_: T, index: number) => index as unknown as K);
  const disabledKeys = options?.disabledKeys;

  const [selectedKeys, setSelectedKeys] = useState<Set<K>>(new Set());
  const lastToggledIndex = useRef<number | null>(null);

  const isDisabled = (key: K): boolean => !!disabledKeys?.has(key);

  const getKeyForIndex = (index: number): K => {
    const item = items[index];
    if (item === undefined) {
      return index as unknown as K;
    }
    return getKey(item, index);
  };

  const toggleSelect = (index: number) => {
    const key = getKeyForIndex(index);
    if (isDisabled(key)) return;

    lastToggledIndex.current = index;
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

  const toggleSelectWithEvent = (
    index: number,
    event?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }
  ) => {
    const key = getKeyForIndex(index);
    if (isDisabled(key)) return;

    if (event?.shiftKey && mode === 'multiple' && lastToggledIndex.current !== null) {
      const start = Math.min(lastToggledIndex.current, index);
      const end = Math.max(lastToggledIndex.current, index);

      setSelectedKeys((prev) => {
        const newSelected = new Set(prev);
        for (let i = start; i <= end; i++) {
          const k = getKeyForIndex(i);
          if (!isDisabled(k)) {
            newSelected.add(k);
          }
        }
        return newSelected;
      });
      lastToggledIndex.current = index;
      return;
    }

    if (event?.metaKey || event?.ctrlKey) {
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
      lastToggledIndex.current = index;
      return;
    }

    toggleSelect(index);
  };

  const toggleSelectByKey = (key: K) => {
    if (isDisabled(key)) return;
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

  const selectableItems = disabledKeys
    ? items.filter((item, index) => !isDisabled(getKey(item, index)))
    : items;

  const selectableKeys = new Set(selectableItems.map(getKey));

  const toggleSelectAll = () => {
    if (mode === 'single') {
      return;
    }

    setSelectedKeys((prev) => {
      const currentSelectableSelected = Array.from(prev).filter(k => selectableKeys.has(k));
      if (currentSelectableSelected.length === selectableItems.length && selectableItems.length > 0) {
        return new Set();
      }
      return new Set(selectableItems.map(getKey));
    });
  };

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

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
    if (selectableItems.length === 0) return false;
    return selectableItems.every((item) => {
      const key = getKey(item, items.indexOf(item));
      return selectedKeys.has(key);
    });
  };

  const isSomeSelected = (): boolean => {
    const count = selectableItems.filter((item) => {
      const key = getKey(item, items.indexOf(item));
      return selectedKeys.has(key);
    }).length;
    return count > 0 && count < selectableItems.length;
  };

  return {
    selectedKeys,
    selectedIndices,
    toggleSelect,
    toggleSelectWithEvent,
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
