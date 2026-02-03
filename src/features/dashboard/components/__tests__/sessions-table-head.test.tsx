import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionsTableHead } from '../sessions-table-head';

vi.mock('../multi-sort-icon', () => ({
  MultiSortIcon: () => <span data-testid="sort-icon" />,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, 'aria-label': ariaLabel }: { checked: boolean; onCheckedChange: (value: boolean) => void; 'aria-label'?: string }) => (
    <button
      type="button"
      role="checkbox"
      aria-label={ariaLabel}
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    />
  ),
}));

describe('SessionsTableHead', () => {
  it('calls onSort when clicking sort buttons', () => {
    const onSort = vi.fn();
    render(
      <table>
        <SessionsTableHead
          sortConfig={[]}
          onSort={onSort}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
        />
      </table>
    );

    fireEvent.click(screen.getByTestId('sort-duration'));
    expect(onSort).toHaveBeenCalledWith('duration', false);
  });

  it('passes shiftKey to onSort', () => {
    const onSort = vi.fn();
    render(
      <table>
        <SessionsTableHead
          sortConfig={[]}
          onSort={onSort}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
        />
      </table>
    );

    fireEvent.click(screen.getByTestId('sort-distance'), { shiftKey: true });
    expect(onSort).toHaveBeenCalledWith('distance', true);
  });

  it('toggles select all checkbox', () => {
    const onToggleSelectAll = vi.fn();
    render(
      <table>
        <SessionsTableHead
          sortConfig={[]}
          onSort={vi.fn()}
          isAllSelected={false}
          onToggleSelectAll={onToggleSelectAll}
        />
      </table>
    );

    fireEvent.click(screen.getByLabelText('Sélectionner toutes les séances'));
    expect(onToggleSelectAll).toHaveBeenCalled();
  });

  it('calls onSort when clicking avgPace sort button', () => {
    const onSort = vi.fn();
    render(
      <table>
        <SessionsTableHead
          sortConfig={[]}
          onSort={onSort}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
        />
      </table>
    );

    fireEvent.click(screen.getByTestId('sort-avgPace'));
    expect(onSort).toHaveBeenCalledWith('avgPace', false);
  });

  it('calls onSort when clicking avgHeartRate sort button', () => {
    const onSort = vi.fn();
    render(
      <table>
        <SessionsTableHead
          sortConfig={[]}
          onSort={onSort}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
        />
      </table>
    );

    fireEvent.click(screen.getByTestId('sort-avgHeartRate'));
    expect(onSort).toHaveBeenCalledWith('avgHeartRate', false);
  });

  it('calls onSort when clicking perceivedExertion sort button', () => {
    const onSort = vi.fn();
    render(
      <table>
        <SessionsTableHead
          sortConfig={[]}
          onSort={onSort}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
        />
      </table>
    );

    fireEvent.click(screen.getByTestId('sort-perceivedExertion'));
    expect(onSort).toHaveBeenCalledWith('perceivedExertion', false);
  });

  it('passes shiftKey to onSort for avgPace', () => {
    const onSort = vi.fn();
    render(
      <table>
        <SessionsTableHead
          sortConfig={[]}
          onSort={onSort}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
        />
      </table>
    );

    fireEvent.click(screen.getByTestId('sort-avgPace'), { shiftKey: true });
    expect(onSort).toHaveBeenCalledWith('avgPace', true);
  });
});
