'use client';

import { ReactNode, useState, useCallback } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorModal } from '@/components/ui/error-modal';
import { ErrorProvider } from '@/contexts/error-context';
import { CACHE_TIME, GC_TIME } from '@/lib/constants';
import { reportError } from '@/lib/errors/reporter';

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.meta?.silentError) {
              return;
            }
            reportError(error);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: CACHE_TIME.DEFAULT,
            gcTime: GC_TIME.DEFAULT,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      })
  );

  const handleSessionExpired = useCallback(() => {
    window.location.href = '/';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider onSessionExpired={handleSessionExpired}>
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster />
          <ErrorModal />
        </TooltipProvider>
      </ErrorProvider>
    </QueryClientProvider>
  );
};
