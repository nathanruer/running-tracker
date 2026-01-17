'use client';

import { ReactNode, useState, useSyncExternalStore } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { CACHE_TIME, GC_TIME, MS_PER_DAY, CACHE_STORAGE_KEY } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

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
            toast({
              title: 'Erreur de chargement',
              description: error.message || 'Une erreur inattendue est survenue.',
              variant: 'destructive',
            });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: CACHE_TIME.DEFAULT,
            gcTime: GC_TIME.DEFAULT,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
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

  if (!mounted || !persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
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
      <TooltipProvider delayDuration={150}>
        {children}
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

