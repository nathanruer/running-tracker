import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  MetricCell,
  CheckboxCell,
  SessionTypeCell,
  DateCell,
  RPECell,
} from '../session-row-cells';

const TableWrapper = ({ children }: { children: React.ReactNode }) => (
  <table>
    <tbody>
      <tr>{children}</tr>
    </tbody>
  </table>
);

describe('MetricCell', () => {
  it('should render value with unit', () => {
    render(
      <TableWrapper>
        <MetricCell value="10.5" unit="km" />
      </TableWrapper>
    );

    expect(screen.getByText('10.5')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
  });

  it('should render empty value for dash', () => {
    render(
      <TableWrapper>
        <MetricCell value="-" />
      </TableWrapper>
    );

    expect(screen.getByText('-')).toHaveClass('text-muted-foreground/10');
  });

  it('should render custom empty value', () => {
    render(
      <TableWrapper>
        <MetricCell value="N/A" emptyValue="N/A" />
      </TableWrapper>
    );

    expect(screen.getByText('N/A')).toHaveClass('text-muted-foreground/10');
  });

  it('should show approximation indicator when showApprox is true', () => {
    render(
      <TableWrapper>
        <MetricCell value="10" showApprox />
      </TableWrapper>
    );

    expect(screen.getByText('~')).toBeInTheDocument();
  });

  it('should apply planned styling when isPlanned is true', () => {
    render(
      <TableWrapper>
        <MetricCell value="10" isPlanned />
      </TableWrapper>
    );

    expect(screen.getByText('10')).toHaveClass('text-muted-foreground/30');
  });
});

describe('CheckboxCell', () => {
  it('should render checkbox when showCheckbox is true', () => {
    render(
      <TableWrapper>
        <CheckboxCell
          showCheckbox
          isSelected={false}
          onToggleSelect={() => {}}
          sessionNumber={1}
        />
      </TableWrapper>
    );

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should not render checkbox when showCheckbox is false', () => {
    render(
      <TableWrapper>
        <CheckboxCell
          showCheckbox={false}
          isSelected={false}
          sessionNumber={1}
        />
      </TableWrapper>
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('should call onToggleSelect when clicked', () => {
    const onToggleSelect = vi.fn();
    render(
      <TableWrapper>
        <CheckboxCell
          showCheckbox
          isSelected={false}
          onToggleSelect={onToggleSelect}
          sessionNumber={1}
        />
      </TableWrapper>
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleSelect).toHaveBeenCalled();
  });

  it('should have correct aria-label', () => {
    render(
      <TableWrapper>
        <CheckboxCell
          showCheckbox
          isSelected={false}
          onToggleSelect={() => {}}
          sessionNumber={5}
        />
      </TableWrapper>
    );

    expect(screen.getByLabelText('Sélectionner la séance 5')).toBeInTheDocument();
  });

  it('should be checked when isSelected is true', () => {
    render(
      <TableWrapper>
        <CheckboxCell
          showCheckbox
          isSelected
          onToggleSelect={() => {}}
          sessionNumber={1}
        />
      </TableWrapper>
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

describe('SessionTypeCell', () => {
  it('should render session type', () => {
    render(
      <TableWrapper>
        <SessionTypeCell
          sessionType="Fractionné"
          hasIntervalDetails={false}
          isOpen={false}
          isPlanned={false}
          workoutTypeLabel={null}
          intervalStructure={null}
        />
      </TableWrapper>
    );

    expect(screen.getByText('Fractionné')).toBeInTheDocument();
  });

  it('should show chevron when hasIntervalDetails is true', () => {
    const { container } = render(
      <TableWrapper>
        <SessionTypeCell
          sessionType="Fractionné"
          hasIntervalDetails
          isOpen={false}
          isPlanned={false}
          workoutTypeLabel={null}
          intervalStructure={null}
        />
      </TableWrapper>
    );

    const chevron = container.querySelector('svg');
    expect(chevron).toBeInTheDocument();
  });

  it('should rotate chevron when isOpen is true', () => {
    const { container } = render(
      <TableWrapper>
        <SessionTypeCell
          sessionType="Fractionné"
          hasIntervalDetails
          isOpen
          isPlanned={false}
          workoutTypeLabel={null}
          intervalStructure={null}
        />
      </TableWrapper>
    );

    const chevron = container.querySelector('svg');
    expect(chevron).toHaveClass('rotate-180');
  });

  it('should show workout type label', () => {
    render(
      <TableWrapper>
        <SessionTypeCell
          sessionType="Fractionné"
          hasIntervalDetails={false}
          isOpen={false}
          isPlanned={false}
          workoutTypeLabel="VMA"
          intervalStructure={null}
        />
      </TableWrapper>
    );

    expect(screen.getByText('VMA')).toBeInTheDocument();
  });

  it('should show interval structure when no workout type label', () => {
    render(
      <TableWrapper>
        <SessionTypeCell
          sessionType="Fractionné"
          hasIntervalDetails={false}
          isOpen={false}
          isPlanned={false}
          workoutTypeLabel={null}
          intervalStructure="8x400m"
        />
      </TableWrapper>
    );

    expect(screen.getByText('8x400m')).toBeInTheDocument();
  });
});

describe('DateCell', () => {
  it('should render date display', () => {
    render(
      <TableWrapper>
        <DateCell dateDisplay="15/01/2024" isPlanned={false} />
      </TableWrapper>
    );

    expect(screen.getByText('15/01/2024')).toBeInTheDocument();
  });

  it('should show "À planifier" for planned sessions without date', () => {
    render(
      <TableWrapper>
        <DateCell dateDisplay={null} isPlanned />
      </TableWrapper>
    );

    expect(screen.getByText('À planifier')).toBeInTheDocument();
  });

  it('should show dash for completed sessions without date', () => {
    render(
      <TableWrapper>
        <DateCell dateDisplay={null} isPlanned={false} />
      </TableWrapper>
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should apply planned styling', () => {
    render(
      <TableWrapper>
        <DateCell dateDisplay="15/01/2024" isPlanned />
      </TableWrapper>
    );

    expect(screen.getByText('15/01/2024')).toHaveClass('text-muted-foreground/30');
  });
});

describe('RPECell', () => {
  it('should render RPE value with /10 suffix', () => {
    render(
      <TableWrapper>
        <RPECell rpe={7} rpeColor="text-yellow-500" />
      </TableWrapper>
    );

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('/10')).toBeInTheDocument();
  });

  it('should render dash when rpe is null', () => {
    render(
      <TableWrapper>
        <RPECell rpe={null} rpeColor="" />
      </TableWrapper>
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should apply rpeColor to value', () => {
    render(
      <TableWrapper>
        <RPECell rpe={9} rpeColor="text-red-500" />
      </TableWrapper>
    );

    expect(screen.getByText('9')).toHaveClass('text-red-500');
  });

  it('should render dash when rpe is 0', () => {
    render(
      <TableWrapper>
        <RPECell rpe={0} rpeColor="" />
      </TableWrapper>
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
