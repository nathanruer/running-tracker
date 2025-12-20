import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/services/api-client';

/**
 * Hook for protecting routes that require authentication
 * Automatically redirects to login page if user is not authenticated
 *
 * @param redirectTo Path to redirect to if not authenticated (default: '/')
 * @returns Object with user data and loading state
 *
 * @example
 * function ProtectedPage() {
 *   const { user, isLoading } = useAuthGuard();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!user) return null; // Will redirect
 *
 *   return <div>Protected content</div>;
 * }
 */
export function useAuthGuard(redirectTo: string = '/') {
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      // User is not authenticated, redirect to login
      router.replace(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

/**
 * Hook for checking authentication without redirecting
 * Useful for conditional rendering based on auth state
 *
 * @returns Object with user data, loading state, and authentication status
 *
 * @example
 * function Header() {
 *   const { user, isAuthenticated } = useAuth();
 *
 *   return (
 *     <header>
 *       {isAuthenticated ? <UserMenu user={user} /> : <LoginButton />}
 *     </header>
 *   );
 * }
 */
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
