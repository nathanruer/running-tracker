'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importFromIntervals } from '@/lib/services/api-client/intervals';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/constants/query-keys';

export function useIntervalsImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: importFromIntervals,
    onSuccess: (result) => {
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

      toast({
        title: 'Import intervals.icu',
        description:
          result.total === 0
            ? 'Aucune course récente sur intervals.icu'
            : 'Aucune nouvelle séance, tout est déjà importé',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Échec de l'import intervals.icu",
        variant: 'destructive',
      });
    },
  });
}
