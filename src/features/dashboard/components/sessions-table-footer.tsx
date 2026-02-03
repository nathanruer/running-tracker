interface SessionsTableFooterProps {
  hasMore: boolean;
  sessionsCount: number;
  isFetchingNextPage: boolean;
}

export function SessionsTableFooter({
  hasMore,
  sessionsCount,
  isFetchingNextPage,
}: SessionsTableFooterProps) {
  return (
    <>
      {hasMore && (
        <div className="mt-6 flex flex-col items-center justify-center p-6 w-full min-h-[100px]">
          {isFetchingNextPage ? (
            <div className="w-full space-y-4 px-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 opacity-40">
                  <div className="h-10 w-10 bg-muted/20 animate-pulse rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-muted/20 animate-pulse rounded-lg" />
                  </div>
                  <div className="h-8 w-16 bg-muted/10 animate-pulse rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em] animate-pulse">
              DÉFILEZ POUR PLUS
            </p>
          )}
        </div>
      )}

      {!hasMore && sessionsCount > 10 && (
        <div className="mt-8 mb-4 flex justify-center opacity-10">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Fin de l&apos;historique</span>
        </div>
      )}
    </>
  );
}
