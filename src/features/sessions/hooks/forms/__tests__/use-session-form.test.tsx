import { renderHook, act } from '@testing-library/react';
import { useSessionForm } from '../use-session-form';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { type TrainingSession } from '@/lib/types';

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
  const mockSession = {
    id: '1',
    date: '2024-01-01',
    sessionType: 'Footing',
    duration: 3600,
    distance: 10,
    avgPace: '06:00',
    avgHeartRate: 150,
    perceivedExertion: 0,
    comments: 'Test',
    status: 'completed',
    source: 'manual',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values in create mode', () => {
    const { result } = renderHook(() => useSessionForm({ mode: 'create', onClose }));

    expect(result.current.form.getValues('sessionType')).toBe('Footing');
    expect(result.current.form.getValues('perceivedExertion')).toBeNull();
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
    expect(result.current.form.getValues('perceivedExertion')).toBeNull();
  });

  it('should initialize perceivedExertion to null in edit mode if it is 0', () => {
    const { result } = renderHook(() => useSessionForm({ 
      mode: 'edit', 
      session: mockSession as unknown as TrainingSession,
      onClose 
    }));

    expect(result.current.form.getValues('perceivedExertion')).toBeNull();
  });

  it('should keep valid perceivedExertion in edit mode', () => {
    const sessionWithRPE = { ...mockSession, perceivedExertion: 5 };
    const { result } = renderHook(() => useSessionForm({ 
      mode: 'edit', 
      session: sessionWithRPE as unknown as TrainingSession, 
      onClose 
    }));

    expect(result.current.form.getValues('perceivedExertion')).toBe(5);
  });
});
