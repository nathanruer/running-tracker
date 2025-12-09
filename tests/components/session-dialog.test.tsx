import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SessionDialog from '@/components/session-dialog';
import * as api from '@/lib/services/api-client';

vi.mock('@/lib/services/api-client', () => ({
  addSession: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ date, onSelect }: any) => (
    <input
      data-testid="date-picker"
      value={date ? (typeof date === 'string' ? date : date.toISOString().split('T')[0]) : ''}
      onChange={(e) => onSelect(new Date(e.target.value))}
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, value, children }: any) => (
    <div data-testid="mock-select">
      <select
        data-testid="select-input"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">Sélectionner</option>
        <option value="Footing">Footing</option>
        <option value="Fractionné">Fractionné</option>
        <option value="Sortie longue">Sortie longue</option>
        <option value="autre">Autre</option>
        {[...Array(11)].map((_, i) => (
          <option key={i} value={i.toString()}>{i}</option>
        ))}
      </select>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

describe('SessionDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form correctly', () => {
    render(
      <SessionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Ajouter une séance')).toBeInTheDocument();
    expect(screen.getByLabelText(/Durée/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Distance/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <SessionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Enregistrer'));

    await waitFor(() => {
      expect(api.addSession).not.toHaveBeenCalled();
    });
  });

  it('submits form with valid data', async () => {
    (api.addSession as any).mockResolvedValue({ id: '123' });

    render(
      <SessionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onClose={mockOnClose}
      />
    );

    fireEvent.change(screen.getByTestId('date-picker'), { target: { value: '2023-01-01' } });
    
    const selects = screen.getAllByTestId('select-input');
    fireEvent.change(selects[0], { target: { value: 'Footing' } }); 

    fireEvent.change(screen.getByLabelText(/Durée/i), { target: { value: '01:00:00' } });

    fireEvent.change(screen.getByLabelText(/Distance/i), { target: { value: '10' } });

    fireEvent.change(screen.getByLabelText(/Allure/i), { target: { value: '06:00' } });

    fireEvent.change(screen.getByLabelText(/FC moyenne/i), { target: { value: '140' } });

    fireEvent.click(screen.getByText('Enregistrer'));

    await waitFor(() => {
      expect(api.addSession).toHaveBeenCalled();
    });
  });
});
