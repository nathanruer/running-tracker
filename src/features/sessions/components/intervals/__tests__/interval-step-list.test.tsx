import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntervalStepList } from '../interval-step-list';
import { Form } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import type { IntervalStep } from '@/lib/types';

interface FormValues {
  steps: IntervalStep[];
  targetEffortPace: string | null;
  targetEffortHR: number | null;
}

const TestWrapper = ({
  defaultSteps = [],
  onMove = vi.fn(),
  onRemove = vi.fn(),
  onAppend = vi.fn(),
  onEntryModeChange = vi.fn(),
}: {
  defaultSteps?: IntervalStep[];
  onMove?: (oldIndex: number, newIndex: number) => void;
  onRemove?: (index: number) => void;
  onAppend?: (step: IntervalStep) => void;
  onEntryModeChange?: (mode: 'quick' | 'detailed') => void;
}) => {
  const form = useForm<FormValues>({
    defaultValues: {
      steps: defaultSteps,
      targetEffortPace: null,
      targetEffortHR: null,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  return (
    <Form {...form}>
      <IntervalStepList
        control={form.control as never}
        watch={form.watch as never}
        setValue={form.setValue as never}
        fields={fields as never}
        onMove={(oldIndex, newIndex) => {
          move(oldIndex, newIndex);
          onMove(oldIndex, newIndex);
        }}
        onRemove={(index) => {
          remove(index);
          onRemove(index);
        }}
        onAppend={(step) => {
          append(step);
          onAppend(step);
        }}
        onEntryModeChange={onEntryModeChange}
      />
    </Form>
  );
};

describe('IntervalStepList', () => {
  it('should render toggle button', () => {
    render(<TestWrapper />);

    expect(screen.getByText('Détails avancés')).toBeInTheDocument();
  });

  it('should expand details when button is clicked', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Détails avancés'));

    expect(screen.getByText('Masquer les détails')).toBeInTheDocument();
  });

  it('should show empty state when no steps', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Détails avancés'));

    expect(screen.getByText('Aucun intervalle pour le moment')).toBeInTheDocument();
  });

  it('should show add button in expanded state', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Détails avancés'));

    expect(screen.getByTestId('btn-add-interval-step')).toBeInTheDocument();
  });

  it('should call onAppend when add button is clicked', () => {
    const onAppend = vi.fn();
    render(<TestWrapper onAppend={onAppend} />);

    fireEvent.click(screen.getByText('Détails avancés'));
    fireEvent.click(screen.getByTestId('btn-add-interval-step'));

    expect(onAppend).toHaveBeenCalled();
  });

  it('should call onEntryModeChange when add button is clicked', () => {
    const onEntryModeChange = vi.fn();
    render(<TestWrapper onEntryModeChange={onEntryModeChange} />);

    fireEvent.click(screen.getByText('Détails avancés'));
    fireEvent.click(screen.getByTestId('btn-add-interval-step'));

    expect(onEntryModeChange).toHaveBeenCalledWith('detailed');
  });

  it('should render steps count in header', () => {
    const steps: IntervalStep[] = [
      { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: null, pace: '06:00', hr: 140 },
      { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: null, pace: '04:00', hr: 170 },
    ];

    render(<TestWrapper defaultSteps={steps} />);

    fireEvent.click(screen.getByText('Détails avancés'));

    expect(screen.getByText(/Étapes détaillée \(2\)/)).toBeInTheDocument();
  });

  it('should render objective fields when expanded', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Détails avancés'));

    expect(screen.getByText('Objectifs de séance')).toBeInTheDocument();
    expect(screen.getByText('Allure cible effort')).toBeInTheDocument();
    expect(screen.getByText('FC cible effort')).toBeInTheDocument();
  });

  it('should collapse details when toggle is clicked again', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Détails avancés'));
    expect(screen.getByText('Masquer les détails')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Masquer les détails'));
    expect(screen.getByText('Détails avancés')).toBeInTheDocument();
  });
});
