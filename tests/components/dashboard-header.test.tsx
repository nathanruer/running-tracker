import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

describe('DashboardHeader', () => {
  const mockRouter = { push: vi.fn() };
  const mockQueryClient = { prefetchQuery: vi.fn() };
  const mockOnNewSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useQueryClient).mockReturnValue(mockQueryClient as unknown as ReturnType<typeof useQueryClient>);
  });

  it('renders the title', () => {
    render(<DashboardHeader onNewSession={mockOnNewSession} />);
    expect(screen.getByText('Running Tracker')).toBeInTheDocument();
  });

  it('renders all navigation buttons', () => {
    render(<DashboardHeader onNewSession={mockOnNewSession} />);
    
    expect(screen.getByRole('button', { name: /Nouvelle séance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bob - ton coach IA/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Profil/i })).toBeInTheDocument();
  });

  it('calls onNewSession when "Nouvelle séance" button is clicked', () => {
    render(<DashboardHeader onNewSession={mockOnNewSession} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Nouvelle séance/i }));
    
    expect(mockOnNewSession).toHaveBeenCalledTimes(1);
  });

  it('navigates to chat page when "Bob - ton coach IA" is clicked', () => {
    render(<DashboardHeader onNewSession={mockOnNewSession} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Bob - ton coach IA/i }));
    
    expect(mockRouter.push).toHaveBeenCalledWith('/chat');
  });

  it('navigates to profile page when "Profil" is clicked', () => {
    render(<DashboardHeader onNewSession={mockOnNewSession} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Profil/i }));
    
    expect(mockRouter.push).toHaveBeenCalledWith('/profile');
  });

  it('prefetches queries on profile button hover', () => {
    render(<DashboardHeader onNewSession={mockOnNewSession} />);
    
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Profil/i }));
    
    expect(mockQueryClient.prefetchQuery).toHaveBeenCalledTimes(2);
    expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['user'] })
    );
    expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sessions', 'all'] })
    );
  });
});
