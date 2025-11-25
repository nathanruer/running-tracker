'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  type: string;
}

interface StravaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any) => void;
}

export function StravaImportDialog({
  open,
  onOpenChange,
  onImport,
}: StravaImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadActivities();
    }
  }, [open]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strava/activities');

      if (response.status === 400 || response.status === 401) {
        setIsConnected(false);
        setActivities([]);
      } else if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
        setIsConnected(true);
      } else {
        throw new Error('Échec de la récupération');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les activités Strava',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStrava = () => {
    window.location.href = '/api/auth/strava/authorize';
  };

  const handleSelectActivity = async (activityId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/strava/activity/${activityId}`);

      if (!response.ok) {
        throw new Error('Échec de la récupération');
      }

      const data = await response.json();
      onImport(data);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'importer l'activité",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importer depuis Strava</DialogTitle>
          <DialogDescription>
            {!isConnected
              ? 'Connectez-vous à Strava pour accéder à vos activités.'
              : 'Sélectionnez une activité à importer.'}
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Utilisez OAuth pour vous connecter en toute sécurité à Strava sans
              partager votre mot de passe.
            </p>
            <Button
              onClick={handleConnectStrava}
              className="w-full gradient-orange"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter avec Strava
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune activité de course trouvée
              </p>
            ) : (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <Button
                    key={activity.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleSelectActivity(activity.id)}
                    disabled={loading}
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">
                          {new Date(activity.start_date_local).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(activity.distance / 1000).toFixed(2)} km
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{activity.name}</span>
                        <span>
                          {Math.floor(activity.moving_time / 60)}:
                          {(activity.moving_time % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
