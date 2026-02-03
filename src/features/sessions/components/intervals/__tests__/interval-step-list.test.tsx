import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntervalStepList } from '../interval-step-list';
import { Form } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import type { IntervalStep } from '@/lib/types';
import { useEffect } from 'react';

let dragEndHandler: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: (event: { active: { id: string }; over: { id: string } | null }) => void }) => {
    dragEndHandler = onDragEnd || null;
    return <div>{children}</div>;
  },
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('../sortable-interval-step', () => ({
  SortableIntervalStep: ({ id, index, onRemove }: { id: string; index: number; onRemove: (index: number) => void }) => (
    <button type="button" data-testid={`remove-${id}`} onClick={() => onRemove(index)}>remove</button>
  ),
}));

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
  onFieldIds,
}: {
  defaultSteps?: IntervalStep[];
  onMove?: (oldIndex: number, newIndex: number) => void;
  onRemove?: (index: number) => void;
  onAppend?: (step: IntervalStep) => void;
  onEntryModeChange?: (mode: 'quick' | 'detailed') => void;
  onFieldIds?: (ids: string[]) => void;
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

  useEffect(() => {
    if (onFieldIds) {
      onFieldIds(fields.map((field) => field.id));
    }
  }, [fields, onFieldIds]);

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

  it('should call onMove when drag ends', () => {
    const onMove = vi.fn();
    let fieldIds: string[] = [];
    const steps: IntervalStep[] = [
      { stepNumber: 1, stepType: 'warmup', duration: '', distance: null, pace: '', hr: null },
      { stepNumber: 2, stepType: 'effort', duration: '', distance: null, pace: '', hr: null },
    ];

    render(<TestWrapper defaultSteps={steps} onMove={onMove} onFieldIds={(ids) => { fieldIds = ids; }} />);

    fireEvent.click(screen.getByText('Détails avancés'));

    act(() => {
      dragEndHandler?.({ active: { id: fieldIds[0] }, over: { id: fieldIds[1] } });
    });

    expect(onMove).toHaveBeenCalledWith(0, 1);
  });

  it('should call onRemove when removing a step', () => {
    const onRemove = vi.fn();
    const onEntryModeChange = vi.fn();
    let fieldIds: string[] = [];
    const steps: IntervalStep[] = [
      { stepNumber: 1, stepType: 'warmup', duration: '', distance: null, pace: '', hr: null },
    ];

    render(
      <TestWrapper
        defaultSteps={steps}
        onRemove={onRemove}
        onEntryModeChange={onEntryModeChange}
        onFieldIds={(ids) => { fieldIds = ids; }}
      />
    );

    fireEvent.click(screen.getByText('Détails avancés'));
    fireEvent.click(screen.getByTestId(`remove-${fieldIds[0]}`));

    expect(onRemove).toHaveBeenCalledWith(0);
    expect(onEntryModeChange).toHaveBeenCalledWith('detailed');
  });
});
