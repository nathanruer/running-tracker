import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

interface ImportedActivitySummaryProps {
  source: string;
  externalId?: string | null;
  date?: string | null;
  distance?: number | string | null;
  duration?: string | null;
  avgPace?: string | null;
  onModify?: () => void;
}

function externalActivityUrl(source: string, externalId: string): string {
  return source === 'strava'
    ? `https://www.strava.com/activities/${externalId}`
    : `https://intervals.icu/activities/${externalId}`;
}

function StravaLogo() {
  return (
    <div className="bg-[#FC4C02] p-2 rounded-xl shadow-lg shadow-orange-500/10">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" fill="white" />
        <path d="M10.233 13.828L7.9 9.111H4.47l5.763 11.38 2.089-4.116-2.089-2.547z" fill="white" opacity="0.6" />
        <path d="M7.9 9.111l2.333 4.717 2.089 2.547 2.089-4.116h3.065L12 0 7.9 9.111z" fill="white" />
      </svg>
    </div>
  );
}

export function ImportedActivitySummary({
  source,
  externalId,
  date,
  distance,
  duration,
  avgPace,
  onModify,
}: ImportedActivitySummaryProps) {
  const isStrava = source === 'strava';

  return (
    <div className="flex flex-col gap-5 p-5 rounded-2xl bg-muted/20 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/10">
        <div className="flex items-center gap-3">
          {isStrava ? (
            <StravaLogo />
          ) : (
            <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-500/10">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-wider text-foreground/90">
              {isStrava ? 'Synchronisation Strava' : 'Synchronisation intervals.icu'}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-emerald-500 font-bold">Activité importée</span>
              {externalId && (
                <a
                  href={externalActivityUrl(source, externalId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary px-1 hover:bg-primary/10 rounded transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {onModify && (
          <Button
            type="button"
            variant="ghost"
            onClick={onModify}
            className="h-8 px-3 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all border border-border/20"
          >
            Modifier
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-1">
        <div className="flex flex-col gap-1">
          <span className="label-caps text-muted-foreground/50">Date</span>
          <span className="text-lg font-black tracking-tight text-foreground/90 whitespace-nowrap">
            {date ? formatDate(date, 'short').split('/').join(' . ') : '--'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="label-caps text-muted-foreground/50">Distance</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black tabular-nums tracking-tight">{distance || '--'}</span>
            <span className="text-[10px] text-muted-foreground/40 font-bold">KM</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="label-caps text-muted-foreground/50">Temps</span>
          <span className="text-lg font-black tabular-nums tracking-tight">{duration || '--'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="label-caps text-muted-foreground/50">Allure</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black tabular-nums tracking-tight">{avgPace || '--'}</span>
            <span className="text-[10px] text-muted-foreground/40 font-bold">/KM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
