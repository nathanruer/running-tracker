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
});
