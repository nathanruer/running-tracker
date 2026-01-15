'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Home, Ghost, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function ErrorPageContent() {
  const searchParams = useSearchParams();

  const errorType = searchParams.get('error');
  
  const getErrorDetails = () => {
    switch (errorType) {
      case 'strava_already_linked':
        return {
          title: 'Compte déjà connecté',
          description: 'Ce compte Strava est déjà associé à un autre utilisateur.',
          icon: <AlertTriangle className="h-10 w-10" />,
          action: { label: 'Gérer mon profil', href: '/profile' }
        };
      case 'strava_api_limit':
        return {
          title: 'Limite Strava atteinte',
          description: 'Nous avons atteint la limite de connexions Strava autorisée pour aujourd\'hui.',
          icon: <Ghost className="h-10 w-10 text-violet-400" />,
          action: { label: 'Retour au tableau de bord', href: '/dashboard' }
        };
      case 'strava_auth_failed':
        return {
          title: 'Échec de connexion',
          description: 'L\'autorisation avec Strava a échoué ou a été annulée.',
          icon: <RefreshCcw className="h-10 w-10" />,
          action: { label: 'Réessayer Strava', href: '/api/auth/strava/authorize', external: true }
        };
      default:
        return {
          title: 'Une erreur est survenue',
          description: 'Nous avons rencontré un obstacle imprévu. Vos données sont en sécurité.',
          icon: <AlertTriangle className="h-10 w-10 text-violet-500" />,
          action: { label: 'Retour au tableau de bord', href: '/dashboard' }
        };
    }
  };

  const details = getErrorDetails();

  return (
    <div className="relative z-10 w-full max-w-lg">
      <div className="rounded-3xl border border-border/40 bg-card/40 p-8 backdrop-blur-xl md:p-12 shadow-2xl text-center border-t-violet-500/20">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-violet-600/10" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600 ring-1 ring-violet-500/20">
              {details.icon}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 mb-2">
            Information Système
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl text-balance">
            {details.title}
          </h1>
          <p className="text-balanced text-muted-foreground leading-relaxed">
            {details.description}
          </p>
        </div>
        
        <div className="mt-10 flex flex-col gap-3">
          {details.action.external ? (
            <Button
              onClick={() => window.location.href = details.action.href}
              size="lg"
              className="h-12 rounded-xl bg-violet-600 font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 active:scale-95 transition-all"
            >
              {details.action.label}
            </Button>
          ) : (
            <Link href={details.action.href}>
              <Button
                size="lg"
                className="w-full h-12 rounded-xl bg-violet-600 font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 active:scale-95 transition-all"
              >
                {details.action.label}
              </Button>
            </Link>
          )}
          
          <Link href="/">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-xl font-semibold text-muted-foreground hover:bg-muted/50 active:scale-95 transition-all"
            >
              <Home className="mr-2 h-4 w-4" />
              Accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorPageFallback() {
  return (
    <div className="relative z-10 w-full max-w-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  );
}

export default function GeneralErrorPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="absolute top-1/4 -right-20 h-96 w-96 animate-pulse rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -left-20 h-96 w-96 animate-pulse rounded-full bg-indigo-600/10 blur-[120px]" />
      
      <Suspense fallback={<ErrorPageFallback />}>
        <ErrorPageContent />
      </Suspense>
    </main>
  );
}
