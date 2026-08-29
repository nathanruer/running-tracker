import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileImportButtons } from '../file-import-buttons';

vi.mock('@/features/import/hooks/use-new-intervals-count', () => ({
  useNewIntervalsCount: () => 0,
}));

describe('FileImportButtons', () => {
  it('should render strava button in create mode with onStravaClick', () => {
    const onStravaClick = vi.fn();
    render(<FileImportButtons mode="create" onStravaClick={onStravaClick} />);

    expect(screen.getByText('Importer depuis intervals.icu')).toBeInTheDocument();
  });

  it('should render import options label', () => {
    const onStravaClick = vi.fn();
    render(<FileImportButtons mode="create" onStravaClick={onStravaClick} />);

    expect(screen.getByText('Options de synchronisation')).toBeInTheDocument();
  });

  it('should render description text', () => {
    const onStravaClick = vi.fn();
    render(<FileImportButtons mode="create" onStravaClick={onStravaClick} />);

    expect(screen.getByText(/Récupère ta course synchronisée depuis Garmin/)).toBeInTheDocument();
  });

  it('should call onStravaClick when strava button is clicked', () => {
    const onStravaClick = vi.fn();
    render(<FileImportButtons mode="create" onStravaClick={onStravaClick} />);

    fireEvent.click(screen.getByText('Importer depuis intervals.icu'));

    expect(onStravaClick).toHaveBeenCalledTimes(1);
  });

  it('should return null in edit mode', () => {
    const onStravaClick = vi.fn();
    const { container } = render(<FileImportButtons mode="edit" onStravaClick={onStravaClick} />);

    expect(container.firstChild).toBeNull();
  });

  it('should return null when onStravaClick is not provided', () => {
    const { container } = render(<FileImportButtons mode="create" />);

    expect(container.firstChild).toBeNull();
  });

  it('should render with default create mode', () => {
    const onStravaClick = vi.fn();
    render(<FileImportButtons onStravaClick={onStravaClick} />);

    expect(screen.getByText('Importer depuis intervals.icu')).toBeInTheDocument();
  });

  it('should render strava button in complete mode', () => {
    const onStravaClick = vi.fn();
    render(<FileImportButtons mode="complete" onStravaClick={onStravaClick} />);

    expect(screen.getByText('Importer depuis intervals.icu')).toBeInTheDocument();
  });

  it('should have correct button styling', () => {
    const onStravaClick = vi.fn();
    render(<FileImportButtons mode="create" onStravaClick={onStravaClick} />);

    const button = screen.getByText('Importer depuis intervals.icu').closest('button');
    expect(button).toHaveClass('bg-violet-600');
  });
});
