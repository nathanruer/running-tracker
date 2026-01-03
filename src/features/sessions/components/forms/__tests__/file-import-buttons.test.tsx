import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FileImportButtons } from '../file-import-buttons';

describe('FileImportButtons', () => {
  it('should render Strava button when onStravaClick is provided', () => {
    const mockOnStravaClick = vi.fn();

    render(<FileImportButtons onStravaClick={mockOnStravaClick} />);

    expect(screen.getByRole('button', { name: /strava/i })).toBeInTheDocument();
  });

  it('should render CSV button when onCsvClick is provided', () => {
    const mockOnCsvClick = vi.fn();

    render(<FileImportButtons onCsvClick={mockOnCsvClick} />);

    expect(screen.getByRole('button', { name: /fichier csv\/json/i })).toBeInTheDocument();
  });

  it('should render both buttons when both callbacks are provided', () => {
    const mockOnStravaClick = vi.fn();
    const mockOnCsvClick = vi.fn();

    render(<FileImportButtons onStravaClick={mockOnStravaClick} onCsvClick={mockOnCsvClick} />);

    expect(screen.getByRole('button', { name: /strava/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fichier csv\/json/i })).toBeInTheDocument();
  });

  it('should render description text', () => {
    const mockOnStravaClick = vi.fn();

    render(<FileImportButtons onStravaClick={mockOnStravaClick} />);

    expect(screen.getByText(/importer une séance/i)).toBeInTheDocument();
    expect(screen.getByText(/pré-remplissez votre séance automatiquement/i)).toBeInTheDocument();
  });

  it('should call onStravaClick when Strava button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnStravaClick = vi.fn();

    render(<FileImportButtons onStravaClick={mockOnStravaClick} />);

    const stravaButton = screen.getByRole('button', { name: /strava/i });
    await user.click(stravaButton);

    expect(mockOnStravaClick).toHaveBeenCalledTimes(1);
  });

  it('should call onCsvClick when CSV button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCsvClick = vi.fn();

    render(<FileImportButtons onCsvClick={mockOnCsvClick} />);

    const csvButton = screen.getByRole('button', { name: /fichier csv\/json/i });
    await user.click(csvButton);

    expect(mockOnCsvClick).toHaveBeenCalledTimes(1);
  });

  it('should not render when mode is edit', () => {
    const mockOnStravaClick = vi.fn();
    const mockOnCsvClick = vi.fn();

    const { container } = render(
      <FileImportButtons mode="edit" onStravaClick={mockOnStravaClick} onCsvClick={mockOnCsvClick} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when no callbacks are provided', () => {
    const { container } = render(<FileImportButtons />);

    expect(container.firstChild).toBeNull();
  });

  it('should render in create mode by default', () => {
    const mockOnStravaClick = vi.fn();

    render(<FileImportButtons onStravaClick={mockOnStravaClick} />);

    expect(screen.getByRole('button', { name: /strava/i })).toBeInTheDocument();
  });

  it('should render in complete mode', () => {
    const mockOnStravaClick = vi.fn();

    render(<FileImportButtons mode="complete" onStravaClick={mockOnStravaClick} />);

    expect(screen.getByRole('button', { name: /strava/i })).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    const mockOnStravaClick = vi.fn();

    const { container } = render(<FileImportButtons onStravaClick={mockOnStravaClick} />);

    const borderContainer = container.querySelector('.border-dashed');
    expect(borderContainer).toBeInTheDocument();
  });

  it('should render Strava button with gradient-orange class', () => {
    const mockOnStravaClick = vi.fn();

    const { container } = render(<FileImportButtons onStravaClick={mockOnStravaClick} />);

    const stravaButton = container.querySelector('.gradient-orange');
    expect(stravaButton).toBeInTheDocument();
  });
});
