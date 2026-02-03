import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { IntervalStepFields, STEP_TYPE_LABELS } from '../interval-step-fields';
import type { IntervalFormValues } from '@/lib/validation/session-form';

describe('IntervalStepFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates pace when duration and distance change', async () => {
    let formRef: ReturnType<typeof useForm<IntervalFormValues>> | null = null;

    const Wrapper = ({ onReady }: { onReady: (form: ReturnType<typeof useForm<IntervalFormValues>>) => void }) => {
      const form = useForm<IntervalFormValues>({
        defaultValues: {
          steps: [
            { duration: '', distance: null, pace: '', hr: null, stepNumber: 1, stepType: 'effort' },
          ],
        },
      });
      useEffect(() => {
        onReady(form);
      }, [form, onReady]);
      return (
        <Form {...form}>
          <IntervalStepFields stepIndex={0} control={form.control} setValue={form.setValue} />
        </Form>
      );
    };

    render(<Wrapper onReady={(form) => { formRef = form; }} />);

    act(() => {
      formRef?.setValue('steps.0.duration', '01:00:00');
      formRef?.setValue('steps.0.distance', 10);
    });

    await waitFor(() => {
      expect(formRef?.getValues('steps.0.pace')).toBe('06:00');
    });
  });

  describe('STEP_TYPE_LABELS', () => {
    it('should export step type labels', () => {
      expect(STEP_TYPE_LABELS).toBeDefined();
    });

    it('should have label for warmup', () => {
      expect(STEP_TYPE_LABELS.warmup).toBe('Échauffement');
    });

    it('should have label for effort', () => {
      expect(STEP_TYPE_LABELS.effort).toBe('Effort');
    });

    it('should have label for recovery', () => {
      expect(STEP_TYPE_LABELS.recovery).toBe('Récupération');
    });

    it('should have label for cooldown', () => {
      expect(STEP_TYPE_LABELS.cooldown).toBe('Retour au calme');
    });

    it('should have exactly 4 step types', () => {
      expect(Object.keys(STEP_TYPE_LABELS)).toHaveLength(4);
    });

    it('should have all step types as keys', () => {
      expect(Object.keys(STEP_TYPE_LABELS)).toEqual([
        'warmup',
        'effort',
        'recovery',
        'cooldown',
      ]);
    });
  });
});
