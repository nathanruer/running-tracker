import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StravaBadge } from '../strava-badge';
import type { StravaConnectScreenProps } from './types';

export function StravaConnectScreen({ loading, onConnect }: StravaConnectScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-8 animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-[#FC4C02]/20 blur-2xl rounded-full" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#FC4C02]/5 border border-[#FC4C02]/10 shadow-inner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" fill="#FC4C02" />
            <path d="M10.233 13.828L7.9 9.111H4.47l5.763 11.38 2.089-4.116-2.089-2.547z" fill="#FC4C02" opacity="0.6" />
            <path d="M7.9 9.111l2.333 4.717 2.089 2.547 2.089-4.116h3.065L12 0 7.9 9.111z" fill="#FC4C02" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold tracking-tight">Connexion à Strava</h3>
        <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
          Connectez votre compte pour importer vos données d&apos;entraînement.
        </p>
      </div>

      <div className="w-full max-w-[320px] space-y-4">
        <Button
          onClick={onConnect}
          variant="action"
          size="xl"
          className="w-full bg-[#FC4C02] hover:bg-[#E34402] transition-none"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter à Strava'}
        </Button>

        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-30">
            Sécurisé via OAuth 2.0
          </p>
          <StravaBadge variant="orange" className="scale-90 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500" />
        </div>
      </div>
    </div>
  );
}
