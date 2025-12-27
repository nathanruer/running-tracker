import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CsvFileUploadSection } from '../csv-file-upload-section';

describe('CsvFileUploadSection', () => {
  it('should render upload icon and instructions', () => {
    const mockOnFileSelect = vi.fn();

    render(<CsvFileUploadSection loading={false} onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText(/sélectionnez un fichier csv ou json/i)).toBeInTheDocument();
    expect(screen.getByText(/colonnes attendues/i)).toBeInTheDocument();
    expect(screen.getByText(/date, séance, durée, distance/i)).toBeInTheDocument();
  });

  it('should render file input with correct attributes', () => {
    const mockOnFileSelect = vi.fn();

    render(<CsvFileUploadSection loading={false} onFileSelect={mockOnFileSelect} />);

    const fileInput = document.querySelector<HTMLInputElement>('#csv-upload');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput?.type).toBe('file');
    expect(fileInput?.accept).toBe('.csv,.txt,.json');
  });

  it('should show upload button when not loading', () => {
    const mockOnFileSelect = vi.fn();

    render(<CsvFileUploadSection loading={false} onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText(/choisir un fichier/i)).toBeInTheDocument();
  });

  it('should show loading text when loading', () => {
    const mockOnFileSelect = vi.fn();

    render(<CsvFileUploadSection loading={true} onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText(/chargement\.\.\./i)).toBeInTheDocument();
  });

  it('should disable button when loading', () => {
    const mockOnFileSelect = vi.fn();

    const { container } = render(<CsvFileUploadSection loading={true} onFileSelect={mockOnFileSelect} />);

    const buttonSpan = container.querySelector('span[disabled]');
    expect(buttonSpan).toBeInTheDocument();
    expect(buttonSpan).toHaveTextContent(/chargement/i);
  });

  it('should not disable button when not loading', () => {
    const mockOnFileSelect = vi.fn();

    const { container } = render(<CsvFileUploadSection loading={false} onFileSelect={mockOnFileSelect} />);

    const buttonSpan = container.querySelector('span[disabled]');
    expect(buttonSpan).not.toBeInTheDocument();
  });

  it('should call onFileSelect when file is selected', async () => {
    const user = userEvent.setup();
    const mockOnFileSelect = vi.fn();

    render(<CsvFileUploadSection loading={false} onFileSelect={mockOnFileSelect} />);

    const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.querySelector<HTMLInputElement>('#csv-upload')!;

    await user.upload(fileInput, file);

    expect(mockOnFileSelect).toHaveBeenCalled();
  });

  it('should display intervalles note', () => {
    const mockOnFileSelect = vi.fn();

    render(<CsvFileUploadSection loading={false} onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText(/la colonne "intervalles"/i)).toBeInTheDocument();
    expect(screen.getByText(/séances de fractionné/i)).toBeInTheDocument();
  });
});
