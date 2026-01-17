import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginCard from '../login-card';
import * as api from '@/lib/services/api-client';
import { useRouter } from 'next/navigation';

vi.mock('@/lib/services/api-client', () => ({
  loginUser: vi.fn().mockResolvedValue({}),
  registerUser: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    clear: vi.fn(),
  }),
}));

describe('LoginCard', () => {
  const mockRouter = { replace: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
  });

  it('renders login form by default', () => {
    render(<LoginCard />);
    expect(screen.getByText('Running Tracker')).toBeInTheDocument();
    expect(screen.getByText('Connectez-vous à votre compte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('switches to register form', () => {
    render(<LoginCard />);
    
    fireEvent.click(screen.getByText("Pas encore de compte ? S'inscrire"));
    
    expect(screen.getByText('Créez votre compte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "S'inscrire" })).toBeInTheDocument();
  });

  it('calls login API on submit', async () => {
    render(<LoginCard />);
    
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByTestId('login-submit'));
    
    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('calls register API on submit when in register mode', async () => {
    render(<LoginCard />);
    
    fireEvent.click(screen.getByText("Pas encore de compte ? S'inscrire"));
    
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'newpass123' } });
    
    fireEvent.click(screen.getByTestId('login-submit'));
    
    await waitFor(() => {
      expect(api.registerUser).toHaveBeenCalledWith('new@example.com', 'newpass123');
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });
});
