import { renderHook } from '@testing-library/react';
import { useFileImport } from '../use-file-import';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/hooks/use-api-error-handler', () => ({
  useApiErrorHandler: () => ({
    handleError: vi.fn(),
    handleSuccess: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-file-input', () => ({
  useFileInput: () => ({
    fileInputRef: { current: null },
    triggerFileSelect: vi.fn(),
    resetFileInput: vi.fn(),
  }),
}));

describe('useFileImport', () => {
  it('should return handler functions', () => {
    const onValuesChange = vi.fn();
    const onIntervalModeChange = vi.fn();
    
    const { result } = renderHook(() => useFileImport({ onValuesChange, onIntervalModeChange }));
    
    expect(result.current.handleCSVImport).toBeDefined();
    expect(result.current.triggerCsvSelect).toBeDefined();
  });
});
