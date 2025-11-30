'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  type: string;
  average_heartrate?: number;
  max_heartrate?: number;
}

interface StravaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any) => void;
  mode?: 'create' | 'edit' | 'complete';
}

export function StravaImportDialog({
  open,
  onOpenChange,
  onImport,
  mode = 'create',
}: StravaImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setActivities([]);
      setSelectedIndices(new Set());
      setSortColumn(null);
      setSortDirection(null);
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

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      // En mode 'complete', limiter à une seule sélection
      if (mode === 'complete') {
        newSelected.clear();
      }
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === activities.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(activities.map((_, i) => i)));
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedActivities = () => {
    if (!sortColumn || !sortDirection) return activities;

    return [...activities].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'date':
          aValue = new Date(a.start_date_local).getTime();
          bValue = new Date(b.start_date_local).getTime();
          break;
        case 'distance':
          aValue = a.distance;
          bValue = b.distance;
          break;
        case 'duration':
          aValue = a.moving_time;
          bValue = b.moving_time;
          break;
        case 'pace':
          // Calculer l'allure en secondes par km (plus petit = plus rapide)
          aValue = a.distance > 0 ? (a.moving_time / (a.distance / 1000)) : 999999;
          bValue = b.distance > 0 ? (b.moving_time / (b.distance / 1000)) : 999999;
          break;
        case 'heartRate':
          aValue = a.average_heartrate || 0;
          bValue = b.average_heartrate || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const handleImportSelected = async () => {
    if (selectedIndices.size === 0) {
      toast({
        title: 'Attention',
        description: 'Veuillez sélectionner au moins une activité',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      const selectedActivities = Array.from(selectedIndices).map(i => activities[i]);
      
      const activity = selectedActivities[0];
      const response = await fetch(`/api/strava/activity/${activity.id}`);

      if (!response.ok) {
        throw new Error('Échec de la récupération');
      }

      const data = await response.json();
      onImport(data);
      onOpenChange(false);
      setSelectedIndices(new Set());
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'importer l'activité",
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (distanceMeters: number, timeSeconds: number) => {
    const kmPerMinute = (timeSeconds / 60) / (distanceMeters / 1000);
    const minutes = Math.floor(kmPerMinute);
    const seconds = Math.round((kmPerMinute - minutes) * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
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
              onClick={handleConnectStrava}
              className="w-full gradient-orange"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter avec Strava
            </Button>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedIndices.size === activities.length ? 'Tout désélectionner' : 'Tout sélectionner'}
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
                          checked={activities.length > 0 && selectedIndices.size === activities.length}
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
                  {getSortedActivities().map((activity, index) => {
                    const originalIndex = activities.findIndex(a => a === activity);
                    return (
                      <TableRow 
                        key={activity.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSelect(originalIndex)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedIndices.has(originalIndex)}
                            onCheckedChange={() => toggleSelect(originalIndex)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          {new Date(activity.start_date_local).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="font-medium">{activity.name}</TableCell>
                        <TableCell className="text-center">{formatDuration(activity.moving_time)}</TableCell>
                        <TableCell className="text-center">{(activity.distance / 1000).toFixed(2)} km</TableCell>
                        <TableCell className="text-center">{formatPace(activity.distance, activity.moving_time)}</TableCell>
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
