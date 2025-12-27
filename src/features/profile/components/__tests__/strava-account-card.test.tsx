import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StravaAccountCard } from '../strava-account-card';
import * as apiClient from '@/lib/services/api-client/auth';

vi.mock('@/lib/services/api-client/auth', () => ({
  disconnectStrava: vi.fn(),
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

describe('StravaAccountCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when stravaId is provided', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <StravaAccountCard stravaId="123456" />
      </Wrapper>
    );

    expect(screen.getByText(/compte strava connecté/i)).toBeInTheDocument();
    expect(screen.getByText(/votre compte strava est actuellement lié/i)).toBeInTheDocument();
  });

  it('should render disconnect button', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <StravaAccountCard stravaId="123456" />
      </Wrapper>
    );

    expect(screen.getByRole('button', { name: /déconnecter strava/i })).toBeInTheDocument();
  });

  it('should not render when stravaId is null', () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <StravaAccountCard stravaId={null} />
      </Wrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when stravaId is undefined', () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <StravaAccountCard stravaId={undefined} />
      </Wrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show disconnect dialog when disconnect button is clicked', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <StravaAccountCard stravaId="123456" />
      </Wrapper>
    );

    const disconnectButton = screen.getByRole('button', { name: /déconnecter strava/i });
    await user.click(disconnectButton);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/déconnexion strava/i)).toBeInTheDocument();
    expect(screen.getByText(/êtes-vous sûr de vouloir déconnecter/i)).toBeInTheDocument();
  });

  it('should close dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <StravaAccountCard stravaId="123456" />
      </Wrapper>
    );

    const disconnectButton = screen.getByRole('button', { name: /déconnecter strava/i });
    await user.click(disconnectButton);

    const dialog = screen.getByRole('alertdialog');
    const cancelButton = within(dialog).getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('should call disconnectStrava API when confirm is clicked', async () => {
    const user = userEvent.setup();
    const mockDisconnectStrava = vi.mocked(apiClient.disconnectStrava);
    mockDisconnectStrava.mockResolvedValue({ success: true, message: 'Disconnected' });

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <StravaAccountCard stravaId="123456" />
      </Wrapper>
    );

    const disconnectButton = screen.getByRole('button', { name: /déconnecter strava/i });
    await user.click(disconnectButton);

    const dialog = screen.getByRole('alertdialog');
    const confirmButton = within(dialog).getAllByRole('button', { name: /déconnecter strava/i })[0];
    await user.click(confirmButton);

    expect(mockDisconnectStrava).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons during disconnect', async () => {
    const user = userEvent.setup();
    const mockDisconnectStrava = vi.mocked(apiClient.disconnectStrava);
    mockDisconnectStrava.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <StravaAccountCard stravaId="123456" />
      </Wrapper>
    );

    const disconnectButton = screen.getByRole('button', { name: /déconnecter strava/i });
    await user.click(disconnectButton);

    const dialog = screen.getByRole('alertdialog');
    const confirmButton = within(dialog).getAllByRole('button', { name: /déconnecter strava/i })[0];
    const cancelButton = within(dialog).getByRole('button', { name: /annuler/i });

    await user.click(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should render dialog with correct destructive styling', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <StravaAccountCard stravaId="123456" />
      </Wrapper>
    );

    const disconnectButton = screen.getByRole('button', { name: /déconnecter strava/i });
    await user.click(disconnectButton);

    const dialog = screen.getByRole('alertdialog');
    const confirmButton = within(dialog).getAllByRole('button', { name: /déconnecter strava/i })[0];

    expect(confirmButton).toHaveClass('bg-destructive');
  });
});
