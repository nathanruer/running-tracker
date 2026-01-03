import { renderHook, act } from '@testing-library/react';
import { useSessionForm } from '../use-session-form';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/services/api-client', () => ({
  addSession: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock('@/hooks/use-api-error-handler', () => ({
  useApiErrorHandler: () => ({
    handleError: vi.fn(),
    handleSuccess: vi.fn(),
  }),
}));

vi.mock('@/features/sessions/components/forms/session-type-selector', () => ({
  PREDEFINED_TYPES: ['Footing', 'Fractionné', 'Sortie Longue', 'Vélo'],
}));

describe('useSessionForm', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values in create mode', () => {
    const { result } = renderHook(() => useSessionForm({ mode: 'create', onClose }));

    expect(result.current.form.getValues('sessionType')).toBe('Footing');
    expect(result.current.isCustomSessionType).toBe(false);
  });
  
  it('should reset form correctly', () => {
    const { result } = renderHook(() => useSessionForm({ mode: 'create', onClose }));
    
    act(() => {
      result.current.form.setValue('comments', 'Test comment');
    });
    expect(result.current.form.getValues('comments')).toBe('Test comment');
    
    act(() => {
      result.current.resetForm();
    });
    expect(result.current.form.getValues('comments')).toBe('');
  });
});
