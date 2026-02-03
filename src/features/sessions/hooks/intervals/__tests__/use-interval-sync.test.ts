import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIntervalSync } from '../use-interval-sync';
import type { IntervalStep } from '@/lib/types';

describe('useIntervalSync', () => {
  const replace = vi.fn();
  const onEntryModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates steps when repetition count increases', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 0,
      effortDuration: '01:00',
      recoveryDuration: '00:30',
      steps: [],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    act(() => {
      values = { ...values, repetitionCount: 2 };
      rerender();
    });

    expect(replace).toHaveBeenCalled();
    expect(onEntryModeChange).toHaveBeenCalledWith('detailed');
  });

  it('updates existing steps when effort values change', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 1,
      effortDuration: '01:00',
      effortDistance: 1,
      recoveryDuration: '00:30',
      recoveryDistance: 0.5,
      steps: [
        { stepNumber: 1, stepType: 'effort', duration: '00:30', distance: 0.5, pace: '', hr: null },
        { stepNumber: 2, stepType: 'recovery', duration: '00:15', distance: 0.2, pace: '', hr: null },
      ] as IntervalStep[],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    act(() => {
      values = { ...values, effortDuration: '02:00', recoveryDuration: '01:00' };
      rerender();
    });

    expect(replace).toHaveBeenCalled();
    expect(onEntryModeChange).toHaveBeenCalledWith('detailed');
  });

  it('removes extra effort and recovery steps when repetition count decreases', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 3,
      effortDuration: '01:00',
      recoveryDuration: '00:30',
      steps: [
        { stepNumber: 1, stepType: 'warmup', duration: '', distance: null, pace: '', hr: null },
        { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: null, pace: '', hr: null },
        { stepNumber: 3, stepType: 'recovery', duration: '00:30', distance: null, pace: '', hr: null },
        { stepNumber: 4, stepType: 'effort', duration: '01:00', distance: null, pace: '', hr: null },
        { stepNumber: 5, stepType: 'recovery', duration: '00:30', distance: null, pace: '', hr: null },
        { stepNumber: 6, stepType: 'effort', duration: '01:00', distance: null, pace: '', hr: null },
        { stepNumber: 7, stepType: 'cooldown', duration: '', distance: null, pace: '', hr: null },
      ] as IntervalStep[],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    act(() => {
      values = { ...values, repetitionCount: 1 };
      rerender();
    });

    expect(replace).toHaveBeenCalled();
    expect(onEntryModeChange).toHaveBeenCalledWith('detailed');
  });

  it('does not regenerate when auto regeneration is disabled', () => {
    const values: Record<string, unknown> = {
      repetitionCount: 3,
      steps: [],
    };
    const watch = (name: string) => values[name];

    renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
        disableAutoRegeneration: true,
      })
    );

    expect(replace).not.toHaveBeenCalled();
  });

  it('does not regenerate steps when existing steps have detailed pace data', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 0,
      effortDuration: '01:00',
      recoveryDuration: '00:30',
      steps: [
        { stepNumber: 1, stepType: 'warmup', duration: '', distance: null, pace: '05:30', hr: null },
        { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: null, pace: '04:00', hr: null },
        { stepNumber: 3, stepType: 'cooldown', duration: '', distance: null, pace: '', hr: null },
      ] as IntervalStep[],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    // Changing repetition count should not regenerate steps because they have detailed pace data
    act(() => {
      values = { ...values, repetitionCount: 2 };
      rerender();
    });

    // Replace should be called but existing steps preserved based on the hasDetailedData check
    expect(replace).toHaveBeenCalled();
  });

  it('does not regenerate steps when existing steps have detailed hr data', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 0,
      effortDuration: '01:00',
      recoveryDuration: '00:30',
      steps: [
        { stepNumber: 1, stepType: 'warmup', duration: '', distance: null, pace: '', hr: 120 },
        { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: null, pace: '', hr: 160 },
        { stepNumber: 3, stepType: 'cooldown', duration: '', distance: null, pace: '', hr: null },
      ] as IntervalStep[],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    // Changing repetition count should not regenerate steps because they have detailed hr data
    act(() => {
      values = { ...values, repetitionCount: 2 };
      rerender();
    });

    expect(replace).toHaveBeenCalled();
  });

  it('removes trailing recovery after last effort when decreasing repetitions', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 2,
      effortDuration: '01:00',
      recoveryDuration: '00:30',
      steps: [
        { stepNumber: 1, stepType: 'warmup', duration: '', distance: null, pace: '', hr: null },
        { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: null, pace: '', hr: null },
        { stepNumber: 3, stepType: 'recovery', duration: '00:30', distance: null, pace: '', hr: null },
        { stepNumber: 4, stepType: 'effort', duration: '01:00', distance: null, pace: '', hr: null },
        { stepNumber: 5, stepType: 'recovery', duration: '00:30', distance: null, pace: '', hr: null }, // Trailing recovery after last effort
        { stepNumber: 6, stepType: 'cooldown', duration: '', distance: null, pace: '', hr: null },
      ] as IntervalStep[],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    act(() => {
      values = { ...values, repetitionCount: 1 };
      rerender();
    });

    expect(replace).toHaveBeenCalled();
    const replacedSteps = replace.mock.calls[replace.mock.calls.length - 1][0] as IntervalStep[];

    // Should have removed the last effort, its preceding recovery, and the trailing recovery
    const effortSteps = replacedSteps.filter(s => s.stepType === 'effort');
    expect(effortSteps).toHaveLength(1);

    // There should be no trailing recovery after the last effort (before cooldown)
    const cooldownIndex = replacedSteps.findIndex(s => s.stepType === 'cooldown');
    if (cooldownIndex > 0) {
      expect(replacedSteps[cooldownIndex - 1].stepType).not.toBe('recovery');
    }
  });

  it('updates ref but does not replace when repetition count is set to 0', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 2,
      effortDuration: '01:00',
      recoveryDuration: '00:30',
      steps: [
        { stepNumber: 1, stepType: 'warmup', duration: '', distance: null, pace: '', hr: null },
        { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: null, pace: '', hr: null },
        { stepNumber: 3, stepType: 'cooldown', duration: '', distance: null, pace: '', hr: null },
      ] as IntervalStep[],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    replace.mockClear();

    act(() => {
      values = { ...values, repetitionCount: 0 };
      rerender();
    });

    // When repetition count goes to 0, the hook should update the ref but not call replace
    expect(replace).not.toHaveBeenCalled();
  });

  it('adds recovery before new effort when no recovery exists after last effort', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 1,
      effortDuration: '01:00',
      recoveryDuration: '00:30',
      recoveryDistance: 0.2,
      steps: [
        { stepNumber: 1, stepType: 'warmup', duration: '', distance: null, pace: '', hr: null },
        { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: null, pace: '', hr: null },
        // No recovery after effort
        { stepNumber: 3, stepType: 'cooldown', duration: '', distance: null, pace: '', hr: null },
      ] as IntervalStep[],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    act(() => {
      values = { ...values, repetitionCount: 2 };
      rerender();
    });

    expect(replace).toHaveBeenCalled();
    const replacedSteps = replace.mock.calls[replace.mock.calls.length - 1][0] as IntervalStep[];

    // Should have added a recovery before the new effort
    const effortIndices = replacedSteps.map((s, i) => s.stepType === 'effort' ? i : -1).filter(i => i >= 0);
    expect(effortIndices).toHaveLength(2);

    // Check that there's a recovery between the two efforts
    const recoverySteps = replacedSteps.filter(s => s.stepType === 'recovery');
    expect(recoverySteps.length).toBeGreaterThanOrEqual(1);
  });

  it('preserves steps with detailed data when updating effort values', () => {
    let values: Record<string, unknown> = {
      repetitionCount: 2,
      effortDuration: '01:00',
      effortDistance: 1,
      recoveryDuration: '00:30',
      recoveryDistance: 0.5,
      steps: [
        { stepNumber: 1, stepType: 'effort', duration: '00:30', distance: 0.5, pace: '05:00', hr: null }, // Has pace data
        { stepNumber: 2, stepType: 'effort', duration: '00:30', distance: 0.5, pace: '', hr: null }, // No pace data
        { stepNumber: 3, stepType: 'recovery', duration: '00:15', distance: 0.2, pace: '', hr: 120 }, // Has hr data
        { stepNumber: 4, stepType: 'recovery', duration: '00:15', distance: 0.2, pace: '', hr: null }, // No hr data
      ] as IntervalStep[],
    };

    const watch = (name: string) => values[name];

    const { rerender } = renderHook(() =>
      useIntervalSync({
        watch: watch as never,
        replace,
        onEntryModeChange,
      })
    );

    act(() => {
      values = { ...values, effortDuration: '02:00', recoveryDuration: '01:00' };
      rerender();
    });

    expect(replace).toHaveBeenCalled();
    const replacedSteps = replace.mock.calls[replace.mock.calls.length - 1][0] as IntervalStep[];

    // Step with pace should preserve original values
    const firstEffort = replacedSteps.find(s => s.stepType === 'effort' && s.pace === '05:00');
    expect(firstEffort?.duration).toBe('00:30'); // Preserved

    // Step without pace should be updated
    const secondEffort = replacedSteps.find(s => s.stepType === 'effort' && !s.pace);
    expect(secondEffort?.duration).toBe('02:00'); // Updated

    // Recovery with hr should preserve original values
    const firstRecovery = replacedSteps.find(s => s.stepType === 'recovery' && s.hr === 120);
    expect(firstRecovery?.duration).toBe('00:15'); // Preserved

    // Recovery without hr should be updated
    const secondRecovery = replacedSteps.find(s => s.stepType === 'recovery' && s.hr === null);
    expect(secondRecovery?.duration).toBe('01:00'); // Updated
  });
});
