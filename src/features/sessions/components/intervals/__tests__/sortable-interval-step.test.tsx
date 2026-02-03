import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SortableIntervalStep } from '../sortable-interval-step';

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: { 'data-testid': 'drag-handle' },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

vi.mock('../interval-step-fields', () => ({
  IntervalStepFields: () => <div data-testid="interval-step-fields" />,
  STEP_TYPE_LABELS: {
    warmup: 'Échauffement',
    effort: 'Effort',
    recovery: 'Récupération',
    cooldown: 'Retour au calme',
  },
}));

describe('SortableIntervalStep', () => {
  const mockWatch = vi.fn();
  const mockSetValue = vi.fn();
  const mockOnRemove = vi.fn();

  const baseProps = {
    id: 'step-1',
    index: 1,
    step: { stepType: 'effort' as const, stepNumber: 2, duration: '', distance: null, pace: '', hr: null },
    control: {} as never,
    watch: mockWatch,
    setValue: mockSetValue,
    onRemove: mockOnRemove,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders effort number based on previous steps', () => {
    mockWatch.mockReturnValue([
      { stepType: 'effort' },
      { stepType: 'effort' },
    ]);

    render(<SortableIntervalStep {...baseProps} />);

    expect(screen.getByText('Effort 2')).toBeInTheDocument();
  });

  it('updates step type when selecting menu item', async () => {
    const user = userEvent.setup();
    mockWatch.mockReturnValue([]);

    render(<SortableIntervalStep {...baseProps} />);

    await user.click(screen.getByText('Récupération'));

    expect(mockSetValue).toHaveBeenCalledWith('steps.1.stepType', 'recovery');
  });

  it('calls onRemove when delete button clicked', async () => {
    const user = userEvent.setup();
    mockWatch.mockReturnValue([]);

    render(<SortableIntervalStep {...baseProps} />);

    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find((btn) => btn.textContent?.includes('Supprimer')) ?? buttons[buttons.length - 1];
    await user.click(deleteButton);

    expect(mockOnRemove).toHaveBeenCalledWith(1);
  });

  it('changes step type to warmup when warmup menu item clicked', async () => {
    const user = userEvent.setup();
    mockWatch.mockReturnValue([]);

    render(<SortableIntervalStep {...baseProps} />);

    await user.click(screen.getByText('Échauffement'));

    expect(mockSetValue).toHaveBeenCalledWith('steps.1.stepType', 'warmup');
  });

  it('changes step type to cooldown when cooldown menu item clicked', async () => {
    const user = userEvent.setup();
    mockWatch.mockReturnValue([]);

    render(<SortableIntervalStep {...baseProps} />);

    await user.click(screen.getByText('Retour au calme'));

    expect(mockSetValue).toHaveBeenCalledWith('steps.1.stepType', 'cooldown');
  });

  it('changes step type to effort when effort menu item clicked', async () => {
    const user = userEvent.setup();
    mockWatch.mockReturnValue([]);

    render(<SortableIntervalStep {...baseProps} />);

    await user.click(screen.getByText('Effort'));

    expect(mockSetValue).toHaveBeenCalledWith('steps.1.stepType', 'effort');
  });

  it('does not call setValue when setValue is not provided', async () => {
    const user = userEvent.setup();
    mockWatch.mockReturnValue([]);

    const propsWithoutSetValue = {
      ...baseProps,
      setValue: undefined,
    };

    render(<SortableIntervalStep {...propsWithoutSetValue} />);

    await user.click(screen.getByText('Échauffement'));

    expect(mockSetValue).not.toHaveBeenCalled();
  });
});
