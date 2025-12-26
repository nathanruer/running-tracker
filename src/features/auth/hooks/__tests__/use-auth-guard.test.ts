import { renderHook } from '@testing-library/react';
import { useAuthGuard, useAuth } from '../use-auth-guard';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/lib/services/api-client', () => ({
  getCurrentUser: vi.fn(),
}));

describe('useAuthGuard', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ replace: mockReplace });
  });

  it('should redirect when user is not authenticated', () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
    });

    renderHook(() => useAuthGuard('/login'));

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('should not redirect when user is authenticated', () => {
    const mockUser = { id: 1, name: 'Test User' };

    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockUser,
      isLoading: false,
    });

    renderHook(() => useAuthGuard('/login'));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should not redirect while loading', () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: true,
    });

    renderHook(() => useAuthGuard('/login'));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should return correct auth state when authenticated', () => {
    const mockUser = { id: 1, name: 'Test User' };

    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockUser,
      isLoading: false,
    });

    const { result } = renderHook(() => useAuthGuard('/login'));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should return correct auth state when not authenticated', () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useAuthGuard('/login'));

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should use default redirect path when not specified', () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
    });

    renderHook(() => useAuthGuard());

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('should redirect when user becomes unauthenticated', () => {
    const { rerender } = renderHook(() => useAuthGuard('/login'));

    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: true,
    });
    rerender();

    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
    });
    rerender();

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user data when authenticated', () => {
    const mockUser = { id: 1, name: 'Test User' };

    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return null user when not authenticated', () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return loading state', () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should return error when query fails', () => {
    const mockError = new Error('Auth failed');

    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should handle user data changes', () => {
    const { rerender } = renderHook(() => useAuth());

    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    let result = renderHook(() => useAuth()).result;
    expect(result.current.isAuthenticated).toBe(false);

    const mockUser = { id: 1, name: 'Test User' };
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    });
    rerender();
    result = renderHook(() => useAuth()).result;
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });
});