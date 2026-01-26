import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-border/40 bg-card/40 p-8 backdrop-blur-xl md:p-12 shadow-2xl text-center border-t-violet-500/20">
          <div className="space-y-4">
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
              Hors sentier
            </h1>
            <p className="text-balanced text-muted-foreground max-w-sm mx-auto">
              La page que vous recherchez n’existe pas ou a été déplacée. Revenez sur le parcours principal pour continuer.
            </p>
          </div>
          
          <div className="mt-10">
            <Link href="/">
              <Button
                size="lg"
                className="w-full h-12 rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-700 active:scale-95 transition-all group"
              >
                Retour au Dashboard
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

