import { render, screen
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SecurityForm } from '../security-form';
import * as authApi from '@/lib/services/api-client/auth';

vi.mock('@/lib/services/api-client/auth', () => ({
  changePassword: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('SecurityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all password fields', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SecurityForm />
      </Wrapper>
    );

    expect(screen.getByLabelText(/mot de passe actuel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nouveau mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmer/i)).toBeInTheDocument();
  });

  it('should render submit button', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SecurityForm />
      </Wrapper>
    );

    expect(screen.getByRole('button', { name: /modifier le mot de passe/i })).toBeInTheDocument();
  });

  it('should show error when current password is empty', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SecurityForm />
      </Wrapper>
    );

    const submitButton = screen.getByRole('button', { name: /modifier le mot de passe/i });
    await user.click(submitButton);

    expect(await screen.findByText(/mot de passe actuel requis/i)).toBeInTheDocument();
  });

  it('should show error when new password is too short', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SecurityForm />
      </Wrapper>
    );

    const currentPasswordInput = screen.getByLabelText(/mot de passe actuel/i);
    const newPasswordInput = screen.getByLabelText(/nouveau mot de passe/i);

    await user.type(currentPasswordInput, 'oldpassword');
    await user.type(newPasswordInput, 'short');

    const submitButton = screen.getByRole('button', { name: /modifier le mot de passe/i });
    await user.click(submitButton);

    expect(await screen.findByText(/au moins 8 caractères/i)).toBeInTheDocument();
  });

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SecurityForm />
      </Wrapper>
    );

    const currentPasswordInput = screen.getByLabelText(/mot de passe actuel/i);
    const newPasswordInput = screen.getByLabelText(/nouveau mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer/i);

    await user.type(currentPasswordInput, 'oldpassword');
    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'differentpassword');

    const submitButton = screen.getByRole('button', { name: /modifier le mot de passe/i });
    await user.click(submitButton);

    expect(await screen.findByText(/ne correspondent pas/i)).toBeInTheDocument();
  });

  it('should call changePassword API with correct data', async () => {
    const user = userEvent.setup();
    const mockChangePassword = vi.mocked(authApi.changePassword);
    mockChangePassword.mockResolvedValue({ success: true, message: 'Password updated' });

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SecurityForm />
      </Wrapper>
    );

    const currentPasswordInput = screen.getByLabelText(/mot de passe actuel/i);
    const newPasswordInput = screen.getByLabelText(/nouveau mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer/i);

    await user.type(currentPasswordInput, 'oldpassword');
    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');

    const submitButton = screen.getByRole('button', { name: /modifier le mot de passe/i });
    await user.click(submitButton);

    expect(mockChangePassword).toHaveBeenCalledWith('oldpassword', 'newpassword123');
  });

  it('should toggle password visibility when eye icon is clicked', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SecurityForm />
      </Wrapper>
    );

    const currentPasswordInput = screen.getByLabelText(/mot de passe actuel/i);
    expect(currentPasswordInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    const firstToggle = toggleButtons[0];
    await user.click(firstToggle);

    expect(currentPasswordInput).toHaveAttribute('type', 'text');

    await user.click(firstToggle);
    expect(currentPasswordInput).toHaveAttribute('type', 'password');
  });

  it('should clear form after successful password change', async () => {
    const user = userEvent.setup();
    const mockChangePassword = vi.mocked(authApi.changePassword);
    mockChangePassword.mockResolvedValue({ success: true, message: 'Password updated' });

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SecurityForm />
      </Wrapper>
    );

    const currentPasswordInput = screen.getByLabelText(/mot de passe actuel/i);
    const newPasswordInput = screen.getByLabelText(/nouveau mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer/i);

    await user.type(currentPasswordInput, 'oldpassword');
    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');

    const submitButton = screen.getByRole('button', { name: /modifier le mot de passe/i });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(currentPasswordInput).toHaveValue('');
      expect(newPasswordInput).toHaveValue('');
      expect(confirmPasswordInput).toHaveValue('');
    });
  });
});
