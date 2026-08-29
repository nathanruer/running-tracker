'use client';

import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importFromIntervals } from '@/lib/services/api-client/intervals';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/constants/query-keys';

const AUTO_IMPORT_STORAGE_KEY = 'rt_last_intervals_auto_import';
const AUTO_IMPORT_MIN_INTERVAL_MS = 30 * 60 * 1000;

interface ImportVariables {
  silent?: boolean;
}

export function useIntervalsImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (_variables: ImportVariables = {}) => importFromIntervals(),
    onSuccess: (result, variables) => {
      if (result.imported > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionsCountBase() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionTypesBase() });
        toast({
          title: 'Import intervals.icu',
          description: `${result.imported} séance${result.imported > 1 ? 's' : ''} importée${result.imported > 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} déjà présente${result.skipped > 1 ? 's' : ''})` : ''}`,
        });
        return;
      }

      if (variables?.silent) return;

      toast({
        title: 'Import intervals.icu',
        description:
          result.total === 0
            ? 'Aucune course récente sur intervals.icu'
            : 'Aucune nouvelle séance, tout est déjà importé',
      });
    },
    onError: (error, variables) => {
      if (variables?.silent) return;
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Échec de l'import intervals.icu",
        variant: 'destructive',
      });
    },
  });
}

export function useAutoIntervalsImport() {
  const { mutate } = useIntervalsImport();

  useEffect(() => {
    let lastRun = 0;
    try {
      lastRun = Number(window.localStorage.getItem(AUTO_IMPORT_STORAGE_KEY)) || 0;
    } catch {
      return;
    }

    if (Date.now() - lastRun < AUTO_IMPORT_MIN_INTERVAL_MS) return;

    try {
      window.localStorage.setItem(AUTO_IMPORT_STORAGE_KEY, String(Date.now()));
    } catch {
      return;
    }
    mutate({ silent: true });
  }, [mutate]);
}
