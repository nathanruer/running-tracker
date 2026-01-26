'use client';

import { ReactNode, useState, useSyncExternalStore, useCallback } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ErrorModal } from '@/components/ui/error-modal';
import { ErrorProvider } from '@/contexts/error-context';
import { CACHE_TIME, GC_TIME, MS_PER_DAY, CACHE_STORAGE_KEY } from '@/lib/constants';
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

  const [persister] = useState(() =>
    typeof window !== 'undefined'
      ? createAsyncStoragePersister({
          storage: window.localStorage,
          key: CACHE_STORAGE_KEY,
        })
      : null
  );

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleSessionExpired = useCallback(() => {
    window.location.href = '/login';
  }, []);

  if (!mounted || !persister) {
    return (
      <NuqsAdapter>
        <QueryClientProvider client={queryClient}>
          <ErrorProvider onSessionExpired={handleSessionExpired}>
            <TooltipProvider delayDuration={150}>
              {children}
              <Toaster />
              <Sonner />
              <ErrorModal />
            </TooltipProvider>
          </ErrorProvider>
        </QueryClientProvider>
      </NuqsAdapter>
    );
  }

  return (
    <NuqsAdapter>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * MS_PER_DAY,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const key = query.queryKey[0];
              return key !== 'user' && key !== 'conversations' && key !== 'conversation';
            },
          },
        }}
      >
        <ErrorProvider onSessionExpired={handleSessionExpired}>
          <TooltipProvider delayDuration={150}>
            {children}
            <Toaster />
            <Sonner />
            <ErrorModal />
          </TooltipProvider>
        </ErrorProvider>
      </PersistQueryClientProvider>
    </NuqsAdapter>
  );
};

