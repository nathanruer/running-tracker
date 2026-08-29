'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  connectIntervalsAccount,
  disconnectIntervalsAccount,
} from '@/lib/services/api-client/intervals';
import { type User } from '@/lib/types';
import { queryKeys } from '@/lib/constants/query-keys';

interface IntervalsAccountCardProps {
  intervalsAthleteId: string | null | undefined;
}

export function IntervalsAccountCard({ intervalsAthleteId }: IntervalsAccountCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const connectMutation = useMutation({
    mutationFn: connectIntervalsAccount,
    onSuccess: ({ athleteId }) => {
      setApiKey('');
      queryClient.setQueryData<User>(queryKeys.user(), (oldUser) =>
        oldUser ? { ...oldUser, intervalsAthleteId: athleteId } : oldUser
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.intervalsActivities() });
      toast({
        title: 'Compte connecté',
        description: `intervals.icu lié (athlète ${athleteId}). Tes courses Garmin arriveront automatiquement.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Connexion impossible.',
        variant: 'destructive',
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectIntervalsAccount,
    onSuccess: () => {
      setShowDisconnectDialog(false);
      queryClient.setQueryData<User>(queryKeys.user(), (oldUser) =>
        oldUser ? { ...oldUser, intervalsAthleteId: null } : oldUser
      );
      queryClient.removeQueries({ queryKey: queryKeys.intervalsActivities() });
      toast({ title: 'Compte déconnecté', description: 'intervals.icu a été délié de ton compte.' });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la déconnexion.',
        variant: 'destructive',
      });
    },
  });

  return (
    <>
      <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-xl font-bold">Services Connectés</CardTitle>
          <CardDescription>
            intervals.icu reçoit tes courses Garmin et alimente l&apos;import automatique.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
          {intervalsAthleteId ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-black text-violet-500 uppercase tracking-widest">intervals.icu</span>
                  <span className="text-xs text-muted-foreground font-medium italic">
                    Athlète {intervalsAthleteId}
                  </span>
                </div>
                <Link2 className="h-5 w-5 text-violet-500/70" />
              </div>

              <Button
                variant="destructive-premium"
                size="xl"
                onClick={() => setShowDisconnectDialog(true)}
                disabled={disconnectMutation.isPending}
                className="w-full border-destructive/20 hover:border-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnecter intervals.icu
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Génère ta clé API sur intervals.icu (Settings → Developer) puis colle-la ici.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  data-testid="intervals-api-key-input"
                  type="password"
                  autoComplete="off"
                  placeholder="Clé API intervals.icu"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={connectMutation.isPending}
                  className="flex-1"
                />
                <Button
                  data-testid="intervals-connect-button"
                  onClick={() => connectMutation.mutate(apiKey.trim())}
                  disabled={connectMutation.isPending || apiKey.trim().length < 10}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Connecter'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        title="Déconnexion intervals.icu"
        description="Tes courses ne seront plus importées automatiquement. Les séances déjà importées restent intactes."
        confirmLabel="Confirmer la déconnexion"
        onConfirm={() => disconnectMutation.mutate()}
        isLoading={disconnectMutation.isPending}
      />
    </>
  );
}
