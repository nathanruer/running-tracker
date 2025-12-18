'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { logger } from '@/lib/infrastructure/logger';

export default function StravaErrorPage() {
  const router = useRouter();
  const [errorType] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('error');
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      
      if (!error) {
        router.replace('/dashboard');
      } else {
        logger.error({ errorType: error }, 'Strava error page displayed');
      }
    }
  }, [router]);

  const getErrorMessage = () => {
    switch (errorType) {
      case 'strava_already_linked':
        return {
          title: 'Compte Strava déjà lié',
          description: 'Vous ne pouvez lier qu\'un seul compte Strava à la fois. Pour en connecter un nouveau, veuillez d\'abord déconnecter votre compte actuel.',
          showProfileButton: true,
        };
      case 'strava_api_limit':
        return {
          title: 'Limite de l\'API Strava atteinte',
          description: 'L\'application a atteint la limite maximale de comptes Strava connectés (limitation du plan gratuit). Veuillez réessayer plus tard ou contactez le support pour plus d\'informations.',
          showRetryButton: false,
        };
      case 'strava_auth_failed':
        return {
          title: 'Échec de connexion Strava',
          description: 'Une erreur est survenue lors de la connexion à Strava. Votre session est préservée.',
          showRetryButton: true,
        };
      case 'missing_strava_code':
        return {
          title: 'Autorisation Strava incomplète',
          description: 'Le processus de connexion à Strava n\'a pas pu être finalisé. Aucune donnée n\'a été modifiée.',
          showRetryButton: true,
        };
      default:
        return {
          title: 'Incident Strava',
          description: 'Une erreur inattendue est survenue avec Strava. Vos données sont préservées.',
          showRetryButton: false,
        };
    }
  };

  const errorMessage = errorType ? getErrorMessage() : null;

  if (!errorType || !errorMessage) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center text-foreground">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold text-gradient">{errorMessage.title}</h1>
        <p className="text-muted-foreground">
          {errorMessage.description}
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 bg-black/20 border border-red-500/30 rounded-lg text-left max-w-md mx-auto">
            <code className="text-xs text-red-400 font-mono break-all">
              Strava Error: {errorType}
            </code>
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => router.push('/dashboard')}
          className="rounded-md border border-border/50 px-6 py-2 text-sm font-medium transition hover:border-primary"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        {errorMessage.showProfileButton && (
          <Button
            onClick={() => router.push('/profile')}
            className="rounded-md border border-border/50 px-6 py-2 text-sm font-medium transition hover:border-primary"
          >
            Aller à mon profil
          </Button>
        )}

        {errorMessage.showRetryButton && (
          <Button
            onClick={() => {
              window.location.href = '/api/auth/strava/authorize';
            }}
            className="rounded-md border border-border/50 px-6 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            Réessayer Strava
          </Button>
        )}
      </div>
    </main>
  );
}