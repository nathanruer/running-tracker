import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center text-foreground">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          404
        </p>
        <h1 className="text-4xl font-semibold text-gradient">Page introuvable</h1>
        <p className="text-muted-foreground">
          La page que vous recherchez n’existe pas ou a été déplacée.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md border border-border/50 px-6 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
      >
        Retour à l’accueil
      </Link>
    </main>
  );
}

