import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginCard from '../login-card';
import * as api from '@/lib/services/api-client';
import { useRouter } from 'next/navigation';
import { AppError, ErrorCode } from '@/lib/errors';
import { ErrorProvider } from '@/contexts/error-context';

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
    render(<ErrorProvider><LoginCard /></ErrorProvider>);
    expect(screen.getByText('Running Tracker')).toBeInTheDocument();
    expect(screen.getByText('Connectez-vous à votre compte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('switches to register form', () => {
    render(<ErrorProvider><LoginCard /></ErrorProvider>);
    
    fireEvent.click(screen.getByText("Pas encore de compte ? S'inscrire"));
    
    expect(screen.getByText('Créez votre compte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "S'inscrire" })).toBeInTheDocument();
  });

  it('calls login API on submit', async () => {
    render(<ErrorProvider><LoginCard /></ErrorProvider>);
    
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByTestId('login-submit'));
    
    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('calls register API on submit when in register mode', async () => {
    render(<ErrorProvider><LoginCard /></ErrorProvider>);

    fireEvent.click(screen.getByText("Pas encore de compte ? S'inscrire"));

    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'newpass123' } });

    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(api.registerUser).toHaveBeenCalledWith('new@example.com', 'newpass123');
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('inline error handling', () => {
    it('shows email error when email is empty', async () => {
      render(<ErrorProvider><LoginCard /></ErrorProvider>);

      fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => {
        expect(screen.getByText("L'email est requis")).toBeInTheDocument();
      });
      expect(api.loginUser).not.toHaveBeenCalled();
    });

    it('shows password error when password is empty', async () => {
      render(<ErrorProvider><LoginCard /></ErrorProvider>);

      fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => {
        expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument();
      });
      expect(api.loginUser).not.toHaveBeenCalled();
    });

    it('shows form error on invalid credentials', async () => {
      vi.mocked(api.loginUser).mockRejectedValueOnce(
        new AppError({ code: ErrorCode.AUTH_INVALID_CREDENTIALS })
      );

      render(<ErrorProvider><LoginCard /></ErrorProvider>);

      fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'wrongpassword' } });
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => {
        expect(screen.getByText('Email ou mot de passe incorrect')).toBeInTheDocument();
      });
    });

    it('shows email field error when email is already taken', async () => {
      vi.mocked(api.registerUser).mockRejectedValueOnce(
        new AppError({ code: ErrorCode.AUTH_EMAIL_TAKEN })
      );

      render(<ErrorProvider><LoginCard /></ErrorProvider>);
      fireEvent.click(screen.getByText("Pas encore de compte ? S'inscrire"));

      fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => {
        expect(screen.getByText('Cette adresse email est déjà utilisée')).toBeInTheDocument();
      });
    });

    it('shows generic error for unknown errors', async () => {
      vi.mocked(api.loginUser).mockRejectedValueOnce(new Error('Network error'));

      render(<ErrorProvider><LoginCard /></ErrorProvider>);

      fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => {
        expect(screen.getByText('Une erreur inattendue est survenue.')).toBeInTheDocument();
      });
    });

    it('clears errors when switching modes', async () => {
      vi.mocked(api.loginUser).mockRejectedValueOnce(
        new AppError({ code: ErrorCode.AUTH_INVALID_CREDENTIALS })
      );

      render(<ErrorProvider><LoginCard /></ErrorProvider>);

      fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'wrongpassword' } });
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => {
        expect(screen.getByText('Email ou mot de passe incorrect')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Pas encore de compte ? S'inscrire"));

      expect(screen.queryByText('Email ou mot de passe incorrect')).not.toBeInTheDocument();
    });
  });
});
