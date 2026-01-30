import { renderHook } from '@testing-library/react';
import { useIntervalSync } from '../use-interval-sync';
import { vi, describe, it, expect } from 'vitest';
import type { UseFormWatch } from 'react-hook-form';
import type { IntervalStep } from '@/lib/types';

interface FormValues {
  repetitionCount?: number | null;
  effortDuration?: string | null;
  effortDistance?: number | null;
  recoveryDuration?: string | null;
  recoveryDistance?: number | null;
  steps?: IntervalStep[];
}

describe('useIntervalSync', () => {
    it('should generate steps when repetitionCount changes from 0 to 3', () => {
        const replace = vi.fn();
        const onEntryModeChange = vi.fn();
        
        let currentCount = 0;
        
        const watch = vi.fn((key: keyof FormValues) => {
            if (key === 'repetitionCount') return currentCount;
            if (key === 'effortDuration') return '00:03:00';
            if (key === 'steps') return [];
            return null;
        }) as unknown as UseFormWatch<FormValues>;

        const { rerender } = renderHook(() => useIntervalSync({
            watch,
            replace,
            onEntryModeChange
        }));

        expect(replace).not.toHaveBeenCalled();

        currentCount = 3;
        rerender();

        expect(replace).toHaveBeenCalled();
        const newSteps = replace.mock.calls[0][0];
        expect(newSteps).toHaveLength(7);
        expect(newSteps[0].stepType).toBe('warmup');
        expect(newSteps[1].stepType).toBe('effort');
        expect(newSteps[1].duration).toBe('00:03:00');
    });

    it('should NOT update steps that have detailed data (pace or hr)', () => {
        const replace = vi.fn();
        const onEntryModeChange = vi.fn();
        
        let effortDuration = '00:03:00';
        const initialSteps: IntervalStep[] = [
            { stepNumber: 1, stepType: 'effort', duration: '00:05:00', distance: 1.0, pace: '4:30', hr: 160 },
            { stepNumber: 2, stepType: 'effort', duration: '00:03:00', distance: 0.5, pace: '', hr: null },
        ];
        
        const watch = vi.fn((key: keyof FormValues) => {
            if (key === 'repetitionCount') return 2;
            if (key === 'effortDuration') return effortDuration;
            if (key === 'steps') return initialSteps;
            return null;
        }) as unknown as UseFormWatch<FormValues>;

        const { rerender } = renderHook(() => useIntervalSync({
            watch,
            replace,
            onEntryModeChange
        }));

        effortDuration = '00:04:00';
        rerender();

        expect(replace).toHaveBeenCalled();
        const updatedSteps = replace.mock.calls[0][0];
        
        expect(updatedSteps[0].duration).toBe('00:05:00');
        
        expect(updatedSteps[1].duration).toBe('00:04:00');
    });
});
