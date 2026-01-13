import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileForm } from '../profile-form';
import { type User } from '@/lib/types';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  weight: 70,
  age: 30,
  maxHeartRate: 190,
  vma: 15,
  goal: 'Run a marathon',
  stravaId: 'strava-123',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('ProfileForm', () => {
  it('should render with initial user data', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <ProfileForm user={mockUser} />
      </Wrapper>
    );

    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
    expect(screen.getByLabelText(/poids/i)).toHaveValue(70);
    expect(screen.getByLabelText(/âge/i)).toHaveValue(30);
    expect(screen.getByLabelText(/fc max/i)).toHaveValue(190);
    expect(screen.getByLabelText(/vma/i)).toHaveValue(15);
    expect(screen.getByLabelText(/objectif/i)).toHaveValue('Run a marathon');
  });

  it('should render save button', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <ProfileForm user={mockUser} />
      </Wrapper>
    );

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });
});
