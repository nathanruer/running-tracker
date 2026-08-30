import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileImportButtons } from '../file-import-buttons';

vi.mock('@/features/import/hooks/use-new-intervals-count', () => ({
  useNewIntervalsCount: () => 0,
}));

describe('FileImportButtons', () => {
  it('should render the import button in create mode with onImportClick', () => {
    const onImportClick = vi.fn();
    render(<FileImportButtons mode="create" onImportClick={onImportClick} />);

    expect(screen.getByText('Importer depuis intervals.icu')).toBeInTheDocument();
  });

  it('should render import options label', () => {
    const onImportClick = vi.fn();
    render(<FileImportButtons mode="create" onImportClick={onImportClick} />);

    expect(screen.getByText('Options de synchronisation')).toBeInTheDocument();
  });

  it('should render description text', () => {
    const onImportClick = vi.fn();
    render(<FileImportButtons mode="create" onImportClick={onImportClick} />);

    expect(screen.getByText(/Récupère ta course synchronisée depuis Garmin/)).toBeInTheDocument();
  });

  it('should call onImportClick when the import button is clicked', () => {
    const onImportClick = vi.fn();
    render(<FileImportButtons mode="create" onImportClick={onImportClick} />);

    fireEvent.click(screen.getByText('Importer depuis intervals.icu'));

    expect(onImportClick).toHaveBeenCalledTimes(1);
  });

  it('should return null in edit mode', () => {
    const onImportClick = vi.fn();
    const { container } = render(<FileImportButtons mode="edit" onImportClick={onImportClick} />);

    expect(container.firstChild).toBeNull();
  });

  it('should return null when onImportClick is not provided', () => {
    const { container } = render(<FileImportButtons mode="create" />);

    expect(container.firstChild).toBeNull();
  });

  it('should render with default create mode', () => {
    const onImportClick = vi.fn();
    render(<FileImportButtons onImportClick={onImportClick} />);

    expect(screen.getByText('Importer depuis intervals.icu')).toBeInTheDocument();
  });

  it('should render the import button in complete mode', () => {
    const onImportClick = vi.fn();
    render(<FileImportButtons mode="complete" onImportClick={onImportClick} />);

    expect(screen.getByText('Importer depuis intervals.icu')).toBeInTheDocument();
  });

  it('should have correct button styling', () => {
    const onImportClick = vi.fn();
    render(<FileImportButtons mode="create" onImportClick={onImportClick} />);

    const button = screen.getByText('Importer depuis intervals.icu').closest('button');
    expect(button).toHaveClass('bg-violet-600');
  });
});
