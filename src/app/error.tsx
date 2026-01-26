'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { logger } from '@/lib/infrastructure/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error({ error, digest: error.digest }, 'Global application error caught by boundary');
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-border/40 bg-card/40 p-8 backdrop-blur-xl md:p-12 shadow-2xl">
          <div className="space-y-4 text-center">
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              Incident de parcours
            </h1>
            <p className="text-balanced text-muted-foreground">
              Une erreur inattendue a stoppé votre session. Pas de panique, vos données d&apos;entraînement sont préservées.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 overflow-hidden rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-red-500/60 font-mono">Debug Info</p>
                <code className="block text-xs text-red-400 font-mono break-all leading-relaxed">{error.message}</code>
              </div>
            )}
          </div>
          
          <div className="mt-10 flex flex-col gap-3">
            <Button
              onClick={() => reset()}
              size="lg"
              className="h-12 rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-700 active:scale-95 transition-all"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Relancer l&apos;application
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/'}
              className="h-12 rounded-xl font-semibold text-muted-foreground hover:bg-muted/50 active:scale-95 transition-all"
            >
              Retour au Dashboard
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
