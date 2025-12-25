import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionForm } from '../use-session-form';
import * as apiClient from '@/lib/services/api-client';
import type { TrainingSession } from '@/lib/types';

vi.mock('@/hooks/use-api-error-handler', () => ({
  useApiErrorHandler: () => ({
    handleError: vi.fn(),
    handleSuccess: vi.fn(),
  }),
}));

vi.mock('@/lib/services/api-client', () => ({
  addSession: vi.fn(),
  updateSession: vi.fn(),
}));

global.fetch = vi.fn();

describe('useSessionForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form initialization', () => {
    it('should initialize with default values in create mode', () => {
      const { result } = renderHook(() =>
        useSessionForm({
          mode: 'create',
          onClose: mockOnClose,
        })
      );

      const formValues = result.current.form.getValues();
      expect(formValues.sessionType).toBe('');
      expect(formValues.duration).toBe('00:00:00');
      expect(formValues.distance).toBe(0);
      expect(result.current.isCustomSessionType).toBe(false);
    });

    it('should initialize with session data in edit mode', () => {
      const session: TrainingSession = {
        id: '1',
        userId: 'user1',
        date: '2024-01-15',
        sessionType: 'Course longue',
        duration: '01:30:00',
        distance: 15000,
        avgPace: '06:00',
        avgHeartRate: 150,
        perceivedExertion: 7,
        comments: 'Test session',
        status: 'completed',
        sessionNumber: 1,
        week: 1,
      };

      const { result } = renderHook(() =>
        useSessionForm({
          mode: 'edit',
          session,
          onClose: mockOnClose,
        })
      );

      const formValues = result.current.form.getValues();
      expect(formValues.sessionType).toBe('Course longue');
      expect(formValues.duration).toBe('01:30:00');
      expect(formValues.distance).toBe(15000);
      expect(formValues.avgPace).toBe('06:00');
      expect(formValues.avgHeartRate).toBe(150);
    });

    it('should initialize with planned session data in complete mode', () => {
      const session: TrainingSession = {
        id: '1',
        userId: 'user1',
        date: '2024-01-15',
        sessionType: 'Fractionné',
        duration: null,
        distance: null,
        avgPace: null,
        avgHeartRate: null,
        perceivedExertion: null,
        comments: '',
        status: 'planned',
        sessionNumber: 1,
        week: 1,
        targetDuration: 60,
        targetDistance: 10000,
        targetPace: '06:00',
        targetHeartRateBpm: '150',
        targetRPE: 7,
      };

      const { result } = renderHook(() =>
        useSessionForm({
          mode: 'complete',
          session,
          onClose: mockOnClose,
        })
      );

      const formValues = result.current.form.getValues();
      expect(formValues.sessionType).toBe('Fractionné');
      expect(formValues.duration).toBe('01:00:00');
      expect(formValues.distance).toBe(10000);
      expect(formValues.avgPace).toBe('06:00');
      expect(formValues.avgHeartRate).toBe(150);
    });
  });

  describe('Form submission', () => {
    it('should create a new session in create mode', async () => {
      const mockSession: TrainingSession = {
        id: '1',
        userId: 'user1',
        date: '2024-01-15',
        sessionType: 'Sortie facile',
        duration: '00:45:00',
        distance: 8000,
        avgPace: '05:30',
        avgHeartRate: 140,
        perceivedExertion: 5,
        comments: '',
        status: 'completed',
        sessionNumber: 1,
        week: 1,
      };

      vi.mocked(apiClient.addSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() =>
        useSessionForm({
          mode: 'create',
          onSuccess: mockOnSuccess,
          onClose: mockOnClose,
        })
      );

      act(() => {
        result.current.form.setValue('date', '2024-01-15');
        result.current.form.setValue('sessionType', 'Sortie facile');
        result.current.form.setValue('duration', '00:45:00');
        result.current.form.setValue('distance', 8000);
        result.current.form.setValue('avgPace', '05:30');
        result.current.form.setValue('avgHeartRate', 140);
        result.current.form.setValue('perceivedExertion', 5);
      });

      await act(async () => {
        await result.current.onSubmit(result.current.form.getValues());
      });

      await waitFor(() => {
        expect(apiClient.addSession).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalledWith(mockSession);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should update session in edit mode', async () => {
      const session: TrainingSession = {
        id: '1',
        userId: 'user1',
        date: '2024-01-15',
        sessionType: 'Sortie facile',
        duration: '00:45:00',
        distance: 8000,
        avgPace: '05:30',
        avgHeartRate: 140,
        perceivedExertion: 5,
        comments: '',
        status: 'completed',
        sessionNumber: 1,
        week: 1,
      };

      const updatedSession = { ...session, distance: 9000 };
      vi.mocked(apiClient.updateSession).mockResolvedValue(updatedSession);

      const { result } = renderHook(() =>
        useSessionForm({
          mode: 'edit',
          session,
          onSuccess: mockOnSuccess,
          onClose: mockOnClose,
        })
      );

      act(() => {
        result.current.form.setValue('distance', 9000);
      });

      await act(async () => {
        await result.current.onSubmit(result.current.form.getValues());
      });

      await waitFor(() => {
        expect(apiClient.updateSession).toHaveBeenCalledWith('1', expect.any(Object));
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedSession);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should complete planned session in complete mode', async () => {
      const session: TrainingSession = {
        id: '1',
        userId: 'user1',
        date: '2024-01-15',
        sessionType: 'Fractionné',
        duration: null,
        distance: null,
        avgPace: null,
        avgHeartRate: null,
        perceivedExertion: null,
        comments: '',
        status: 'planned',
        sessionNumber: 1,
        week: 1,
        targetDuration: 60,
        targetDistance: 10000,
        targetPace: '06:00',
        targetHeartRateBpm: '150',
        targetRPE: 7,
      };

      const completedSession = { ...session, status: 'completed' as const, duration: '01:00:00' };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => completedSession,
      } as Response);

      const { result } = renderHook(() =>
        useSessionForm({
          mode: 'complete',
          session,
          onSuccess: mockOnSuccess,
          onClose: mockOnClose,
        })
      );

      act(() => {
        result.current.form.setValue('duration', '01:00:00');
        result.current.form.setValue('distance', 10000);
      });

      await act(async () => {
        await result.current.onSubmit(result.current.form.getValues());
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/sessions/1/complete', expect.any(Object));
        expect(mockOnSuccess).toHaveBeenCalledWith(completedSession);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Reset form', () => {
    it('should reset form to default values', () => {
      const session: TrainingSession = {
        id: '1',
        userId: 'user1',
        date: '2024-01-15',
        sessionType: 'Sortie facile',
        duration: '00:45:00',
        distance: 8000,
        avgPace: '05:30',
        avgHeartRate: 140,
        perceivedExertion: 5,
        comments: '',
        status: 'completed',
        sessionNumber: 1,
        week: 1,
      };

      const { result } = renderHook(() =>
        useSessionForm({
          mode: 'edit',
          session,
          onClose: mockOnClose,
        })
      );

      act(() => {
        result.current.resetForm();
      });

      const formValues = result.current.form.getValues();
      expect(formValues.sessionType).toBe('');
      expect(formValues.duration).toBe('00:00:00');
      expect(formValues.distance).toBe(0);
      expect(result.current.isCustomSessionType).toBe(false);
    });
  });

  describe('Custom session type', () => {
    it('should detect custom session type', () => {
      const session: TrainingSession = {
        id: '1',
        userId: 'user1',
        date: '2024-01-15',
        sessionType: 'Mon type custom',
        duration: '00:45:00',
        distance: 8000,
        avgPace: '05:30',
        avgHeartRate: null,
        perceivedExertion: null,
        comments: '',
        status: 'completed',
        sessionNumber: 1,
        week: 1,
      };

      const { result } = renderHook(() =>
        useSessionForm({
          mode: 'edit',
          session,
          onClose: mockOnClose,
        })
      );

      expect(result.current.isCustomSessionType).toBe(true);
    });
  });
});
