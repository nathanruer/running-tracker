import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ModeToggleButton } from '../mode-toggle-button';

describe('ModeToggleButton', () => {
  it('should render both duration and distance buttons', () => {
    const mockOnChange = vi.fn();

    render(<ModeToggleButton mode="duration" onChange={mockOnChange} />);

    expect(screen.getByRole('button', { name: /temps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dist\./i })).toBeInTheDocument();
  });

  it('should highlight duration button when mode is duration', () => {
    const mockOnChange = vi.fn();

    render(<ModeToggleButton mode="duration" onChange={mockOnChange} />);

    const durationButton = screen.getByRole('button', { name: /temps/i });
    const distanceButton = screen.getByRole('button', { name: /dist\./i });

    expect(durationButton).toHaveClass('bg-secondary');
    expect(distanceButton).not.toHaveClass('bg-secondary');
  });

  it('should highlight distance button when mode is distance', () => {
    const mockOnChange = vi.fn();

    render(<ModeToggleButton mode="distance" onChange={mockOnChange} />);

    const durationButton = screen.getByRole('button', { name: /temps/i });
    const distanceButton = screen.getByRole('button', { name: /dist\./i });

    expect(distanceButton).toHaveClass('bg-secondary');
    expect(durationButton).not.toHaveClass('bg-secondary');
  });

  it('should call onChange with duration when duration button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<ModeToggleButton mode="distance" onChange={mockOnChange} />);

    const durationButton = screen.getByRole('button', { name: /temps/i });
    await user.click(durationButton);

    expect(mockOnChange).toHaveBeenCalledWith('duration');
  });

  it('should call onChange with distance when distance button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<ModeToggleButton mode="duration" onChange={mockOnChange} />);

    const distanceButton = screen.getByRole('button', { name: /dist\./i });
    await user.click(distanceButton);

    expect(mockOnChange).toHaveBeenCalledWith('distance');
  });

  it('should render custom labels when provided', () => {
    const mockOnChange = vi.fn();
    const customLabels = {
      duration: 'Time',
      distance: 'Distance',
    };

    render(
      <ModeToggleButton
        mode="duration"
        onChange={mockOnChange}
        labels={customLabels}
      />
    );

    expect(screen.getByRole('button', { name: /time/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /distance/i })).toBeInTheDocument();
  });

  it('should not call onChange when clicking already active button', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<ModeToggleButton mode="duration" onChange={mockOnChange} />);

    const durationButton = screen.getByRole('button', { name: /temps/i });
    await user.click(durationButton);

    expect(mockOnChange).toHaveBeenCalledWith('duration');
  });
});
