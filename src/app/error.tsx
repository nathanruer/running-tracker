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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center text-foreground">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold text-gradient">Oups, incident de parcours</h1>
        <p className="text-muted-foreground">
          Une erreur inattendue a stoppé votre session. Pas de panique, vos données d&apos;entraînement sont préservées.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 bg-black/20 border border-red-500/30 rounded-lg text-left max-w-md mx-auto">
            <code className="text-xs text-red-400 font-mono break-all">{error.message}</code>
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => reset()}
          className="rounded-md border border-border/50 px-6 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Relancer l&apos;application
        </Button>
      </div>
    </main>
  );
}
