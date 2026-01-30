import { renderHook, act } from '@testing-library/react';
import { useSessionForm } from '../use-session-form';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { type TrainingSession } from '@/lib/types';

vi.mock('@/lib/services/api-client', () => ({
  addSession: vi.fn(),
  updateSession: vi.fn(),
  completeSession: vi.fn(),
}));

vi.mock('@/hooks/use-error-handler', () => ({
  useErrorHandler: () => ({
    error: null,
    handleError: vi.fn(),
    handleSuccess: vi.fn(),
    clearError: vi.fn(),
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

  afterEach(() => {
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
    const { result } = renderHook(() =>
      useSessionForm({
        mode: 'edit',
        session: mockSession as unknown as TrainingSession,
        onClose,
      })
    );

    expect(result.current.form.getValues('perceivedExertion')).toBeNull();
  });

  it('should keep valid perceivedExertion in edit mode', () => {
    const sessionWithRPE = { ...mockSession, perceivedExertion: 5 };
    const { result } = renderHook(() =>
      useSessionForm({
        mode: 'edit',
        session: sessionWithRPE as unknown as TrainingSession,
        onClose,
      })
    );

    expect(result.current.form.getValues('perceivedExertion')).toBe(5);
  });

  it('should include perceivedExertion in update payload for completed sessions', async () => {
    const { updateSession } = await import('@/lib/services/api-client');
    const onSuccess = vi.fn();

    const sessionWithRPE = {
      ...mockSession,
      id: 'session-123',
      status: 'completed',
      perceivedExertion: 5,
    };

    const { result } = renderHook(() =>
      useSessionForm({
        mode: 'edit',
        session: sessionWithRPE as unknown as TrainingSession,
        onClose,
        onSuccess,
      })
    );

    act(() => {
      result.current.form.setValue('perceivedExertion', 8);
      result.current.form.setValue('duration', '01:00:00');
      result.current.form.setValue('distance', 10);
      result.current.form.setValue('avgPace', '06:00');
    });

    await act(async () => {
      await result.current.onUpdate(result.current.form.getValues());
    });

    expect(updateSession).toHaveBeenCalledWith(
      'session-123',
      expect.objectContaining({
        perceivedExertion: 8,
        sessionType: 'Footing',
        duration: '01:00:00',
        distance: 10,
        avgPace: '06:00',
      })
    );
  });

  it('should preserve interval target values when completing with imported data', () => {
    const plannedIntervalSession = {
      id: 'interval-session-1',
      date: '2024-01-01',
      sessionType: 'Fractionné',
      status: 'planned',
      targetRPE: 7,
      comments: 'Séance SEUIL',
      intervalDetails: {
        workoutType: 'SEUIL',
        repetitionCount: 3,
        effortDuration: '08:00',
        recoveryDuration: '02:00',
        targetEffortPace: '05:07',
        targetEffortHR: 175,
        targetRecoveryPace: '07:30',
        steps: [
          { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: 1.48, pace: '06:45', hr: 152 },
          { stepNumber: 2, stepType: 'effort', duration: '08:00', distance: 1.56, pace: '05:07', hr: 175 },
        ],
      },
    };

    const importedData = {
      date: '2024-01-01',
      duration: '00:45:00',
      distance: 7.5,
      avgPace: '06:00',
      avgHeartRate: 165,
      steps: [
        { stepNumber: 1, stepType: 'warmup' as const, duration: '13:00', distance: 1.9, pace: '06:50', hr: 141 },
        { stepNumber: 2, stepType: 'effort' as const, duration: '08:00', distance: 1.59, pace: '05:01', hr: 164 },
      ],
    };

    const { result } = renderHook(() =>
      useSessionForm({
        mode: 'complete',
        session: plannedIntervalSession as unknown as TrainingSession,
        initialData: importedData,
        onClose,
      })
    );

    expect(result.current.form.getValues('workoutType')).toBe('SEUIL');
    expect(result.current.form.getValues('targetEffortPace')).toBe('05:07');
    expect(result.current.form.getValues('targetEffortHR')).toBe(175);
    expect(result.current.form.getValues('targetRecoveryPace')).toBe('07:30');
    expect(result.current.form.getValues('effortDuration')).toBe('08:00');
    expect(result.current.form.getValues('recoveryDuration')).toBe('02:00');

    expect(result.current.form.getValues('steps')).toHaveLength(2);
    expect(result.current.form.getValues('steps.0.duration')).toBe('10:00');
    expect(result.current.form.getValues('steps.1.pace')).toBe('05:07');

    expect(result.current.form.getValues('duration')).toBe('00:45:00');
    expect(result.current.form.getValues('distance')).toBe(7.5);
    expect(result.current.form.getValues('avgHeartRate')).toBe(165);
  });

  it('should set form field error when date is missing on submit in complete mode', async () => {
    const plannedSession = {
      ...mockSession,
      id: 'session-to-complete',
      status: 'planned',
      date: null,
    };

    const { result } = renderHook(() =>
      useSessionForm({
        mode: 'complete',
        session: plannedSession as unknown as TrainingSession,
        onClose,
      })
    );

    act(() => {
      result.current.form.setValue('isCompletion', true);
      result.current.form.setValue('date', '', { shouldValidate: true });
      result.current.form.setValue('duration', '01:00:00', { shouldValidate: true });
      result.current.form.setValue('distance', 10, { shouldValidate: true });
      result.current.form.setValue('avgPace', '06:00', { shouldValidate: true });
    });

    await act(async () => {
      await result.current.form.trigger();
    });

    expect(result.current.form.formState.errors.date).toBeDefined();
    expect(result.current.form.formState.errors.date?.message).toBe('Date requise');
  });

  it('should not require date in create mode (date is optional for planning)', async () => {
    const { result } = renderHook(() =>
      useSessionForm({
        mode: 'create',
        onClose,
      })
    );

    act(() => {
      result.current.form.setValue('date', '', { shouldValidate: true });
      result.current.form.setValue('duration', '01:00:00', { shouldValidate: true });
      result.current.form.setValue('distance', 10, { shouldValidate: true });
      result.current.form.setValue('avgPace', '06:00', { shouldValidate: true });
    });

    await act(async () => {
      await result.current.form.trigger();
    });

    expect(result.current.form.formState.errors.date).toBeUndefined();
  });
});
