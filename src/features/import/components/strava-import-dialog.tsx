'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { type QueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { bulkImportSessions } from '@/lib/services/api-client';
import { useStravaActivities, type StravaActivity } from '../hooks/use-strava-activities';
import { useTableSort } from '@/hooks/use-table-sort';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import { formatDuration } from '@/lib/utils/duration';
import { calculatePaceString } from '@/lib/utils/formatters';
import { StravaBadge } from '@/components/ui/strava-badge';

interface StravaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: Record<string, unknown>) => void;
  mode?: 'create' | 'edit' | 'complete';
  queryClient?: QueryClient;
  onBulkImportSuccess?: () => void;
}

export function StravaImportDialog({
  open,
  onOpenChange,
  onImport,
  mode = 'create',
  queryClient,
  onBulkImportSuccess,
}: StravaImportDialogProps) {
  const [importing, setImporting] = useState(false);

  const { activities, loading, isConnected, connectToStrava } = useStravaActivities(open);
  const { handleError, handleSuccess, handleWarning } = useApiErrorHandler();
  const { handleSort, SortIcon, defaultComparator, sortColumn } = useTableSort<StravaActivity>(
    activities,
    null,
    null
  );
  const {
    selectedIndices,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useTableSelection(activities, mode === 'complete' ? 'single' : 'multiple');

  const sortedActivities = defaultComparator((activity: StravaActivity, column: string) => {
    switch (column) {
      case 'date':
        return new Date(activity.start_date_local);
      case 'distance':
        return activity.distance;
      case 'duration':
        return activity.moving_time;
      case 'pace':
        return activity.distance > 0 ? activity.moving_time / (activity.distance / 1000) : 999999;
      case 'heartRate':
        return activity.average_heartrate || 0;
      default:
        return '';
    }
  });

  const handleImportSelected = async () => {
    if (selectedIndices.size === 0) {
      handleWarning('Veuillez sélectionner au moins une activité');
      return;
    }

    setImporting(true);
    try {
      const selectedActivities = Array.from(selectedIndices).map((i) => activities[i]);

      if (mode === 'complete') {
        const activity = selectedActivities[0];
        const response = await fetch(`/api/strava/activities/${activity.id}`);

        if (!response.ok) {
          throw new Error('Échec de la récupération');
        }

        const data = await response.json();
        onImport(data);
        onOpenChange(false);
        clearSelection();
      } else if (selectedIndices.size === 1) {
        const activity = selectedActivities[0];
        const response = await fetch(`/api/strava/activities/${activity.id}`);

        if (!response.ok) {
          throw new Error('Échec de la récupération');
        }

        const data = await response.json();
        onImport(data);
        onOpenChange(false);
        clearSelection();
      } else {
        const activityPromises = selectedActivities.map(async (activity) => {
          try {
            const response = await fetch(`/api/strava/activities/${activity.id}`);
            if (response.ok) {
              return await response.json();
            }
            return null;
          } catch {
            return null;
          }
        });

        const fetchedActivities = (await Promise.all(activityPromises)).filter(Boolean);

        if (fetchedActivities.length === 0) {
          handleError(null, "Aucune activité n'a pu être récupérée depuis Strava");
          return;
        }

        const sessionsToImport = fetchedActivities.map((activity) => ({
          date: new Date(activity.date).toISOString().split('T')[0],
          sessionType: '-',
          duration: activity.duration,
          distance: activity.distance,
          avgPace: activity.avgPace,
          avgHeartRate: activity.avgHeartRate || null,
          perceivedExertion: null,
          comments: activity.comments || '',
          externalId: activity.externalId,
          source: activity.source,
          stravaData: activity.stravaData,
          elevationGain: activity.elevationGain,
          averageCadence: activity.averageCadence,
          averageTemp: activity.averageTemp,
          calories: activity.calories,
        }));

        const result = await bulkImportSessions(sessionsToImport);

        handleSuccess(
          'Import réussi',
          `${result.count} séance(s) Strava importée(s) avec succès`
        );

        onOpenChange(false);
        clearSelection();

        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        }

        if (onBulkImportSuccess) {
          onBulkImportSuccess();
        }

        return;
      }
    } catch (error) {
      handleError(error, "Impossible d'importer les activités");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-hidden ${isConnected && activities.length > 0 ? 'sm:max-w-[900px]' : 'sm:max-w-[425px]'}`}>
        <DialogHeader>
          <DialogTitle>Importer depuis Strava</DialogTitle>
          <DialogDescription>
            {!isConnected
              ? 'Connectez-vous à Strava pour accéder à vos activités.'
              : mode === 'complete'
                ? 'Sélectionnez une activité à importer pour cette séance.'
                : 'Sélectionnez une ou plusieurs activités à importer.'}
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Utilisez OAuth pour vous connecter en toute sécurité à Strava sans
              partager votre mot de passe.
            </p>
            <Button
              onClick={connectToStrava}
              className="w-full gradient-orange"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter avec Strava
            </Button>
            <div className="flex justify-end w-full">
              <StravaBadge variant="orange" />
            </div>
          </div>
        ) : loading || activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            {loading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">Chargement des activités...</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Aucune activité de course trouvée
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">
                {activities.length} activité(s) trouvée(s)
              </p>
              {mode !== 'complete' && (
                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                  {isAllSelected() ? 'Tout désélectionner' : 'Tout sélectionner'}
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      {mode !== 'complete' && (
                        <Checkbox
                          checked={activities.length > 0 && isAllSelected()}
                          onCheckedChange={toggleSelectAll}
                        />
                      )}
                    </TableHead>
                    <TableHead className="text-center">
                      <button 
                        onClick={() => handleSort('date')}
                        className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                      >
                        <SortIcon column="date" />
                        <span className={sortColumn === 'date' ? 'text-foreground' : ''}>Date</span>
                      </button>
                    </TableHead>
                    <TableHead>Activité</TableHead>
                    <TableHead className="text-center">
                      <button 
                        onClick={() => handleSort('duration')}
                        className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                      >
                        <SortIcon column="duration" />
                        <span className={sortColumn === 'duration' ? 'text-foreground' : ''}>Durée</span>
                      </button>
                    </TableHead>
                    <TableHead className="text-center">
                      <button 
                        onClick={() => handleSort('distance')}
                        className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                      >
                        <SortIcon column="distance" />
                        <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Distance</span>
                      </button>
                    </TableHead>
                    <TableHead className="text-center">
                      <button
                        onClick={() => handleSort('pace')}
                        className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                      >
                        <SortIcon column="pace" />
                        <span className={sortColumn === 'pace' ? 'text-foreground' : ''}>Allure</span>
                      </button>
                    </TableHead>
                    <TableHead className="text-center">
                      <button 
                        onClick={() => handleSort('heartRate')}
                        className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                      >
                        <SortIcon column="heartRate" />
                        <span className={sortColumn === 'heartRate' ? 'text-foreground' : ''}>FC moy</span>
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedActivities.map((activity) => {
                    const originalIndex = activities.findIndex((a) => a === activity);
                    return (
                      <TableRow
                        key={activity.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSelect(originalIndex)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected(originalIndex)}
                            onCheckedChange={() => toggleSelect(originalIndex)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          {new Date(activity.start_date_local).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="font-medium">{activity.name}</TableCell>
                        <TableCell className="text-center">{formatDuration(activity.moving_time)}</TableCell>
                        <TableCell className="text-center">{(activity.distance / 1000).toFixed(2)} km</TableCell>
                        <TableCell className="text-center">{calculatePaceString(activity.distance, activity.moving_time)}</TableCell>
                        <TableCell className="text-center">
                          {activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleImportSelected} 
                className="flex-1 gradient-violet"
                disabled={importing || selectedIndices.size === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  `Importer ${selectedIndices.size} activité(s)`
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
