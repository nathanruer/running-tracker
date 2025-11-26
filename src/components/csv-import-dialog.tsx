'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

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
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (sessions: any[]) => void;
}

interface ParsedSession {
  date: string;
  sessionType: string;
  duration: string;
  distance: number;
  avgPace: string;
  avgHeartRate: number;
  intervalStructure?: string;
  comments: string;
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImport,
}: CsvImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedSession[]>([]);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  const parseDate = (dateStr: string): string => {
    const datePatterns = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      /^(\d{2})-(\d{2})-(\d{4})$/,
      /^(\d{4})-(\d{2})-(\d{2})$/,
    ];

    for (const pattern of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (pattern === datePatterns[2]) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }

    return '';
  };

  const parseDuration = (durationStr: string): string => {
    const parts = durationStr.split(':');
    if (parts.length === 3) {
      return durationStr;
    } else if (parts.length === 2) {
      return `00:${durationStr}`;
    }
    return '00:00:00';
  };

  const parseAllure = (allureStr: string): string => {
    const paceMatch = allureStr.match(/(\d{1,2}):(\d{2})/);
    if (paceMatch) {
      return `${paceMatch[1].padStart(2, '0')}:${paceMatch[2]}`;
    }
    
    return '00:00';
  };

  const extractIntervalStructure = (allureStr: string): string => {
    if (!allureStr || !allureStr.includes('x')) {
      return '';
    }
    
    const intervalMatch = allureStr.match(/([A-Z]*:?\s*\d+x[\d'\/]+|TEMPO:\s*\d+x[\d'\/]+)/i);
    if (intervalMatch) {
      return intervalMatch[1].trim();
    }
    
    return '';
  };

  const parseNumber = (numStr: string): number => {
    if (!numStr || numStr.trim() === '') return 0;
    const cleaned = numStr.replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const detectColumns = (headers: string[]): Map<string, string> => {
    const columnMap = new Map<string, string>();
    
    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      if (!normalizedHeader) return;
      
      if (normalizedHeader.includes('date')) {
        columnMap.set('date', header);
      } else if (normalizedHeader.includes('séance') || normalizedHeader.includes('seance') || normalizedHeader === 'type') {
        columnMap.set('sessionType', header);
      } else if (normalizedHeader.includes('durée') || normalizedHeader.includes('duree') || normalizedHeader.includes('duration')) {
        columnMap.set('duration', header);
      } else if (normalizedHeader.includes('distance')) {
        columnMap.set('distance', header);
      } else if (normalizedHeader.includes('allure') || normalizedHeader.includes('pace')) {
        columnMap.set('avgPace', header);
      } else if (normalizedHeader.includes('fc') || normalizedHeader.includes('heart')) {
        columnMap.set('avgHeartRate', header);
      } else if (normalizedHeader.includes('intervalle') || normalizedHeader.includes('interval') || normalizedHeader.includes('structure') || normalizedHeader.includes('fractionné') || normalizedHeader.includes('fractionne')) {
        columnMap.set('intervalStructure', header);
      } else if (normalizedHeader.includes('commentaire') || normalizedHeader.includes('comment')) {
        columnMap.set('comments', header);
      }
    });
    
    return columnMap;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setPreview([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const columnMap = detectColumns(headers);

          const parsedSessions: ParsedSession[] = results.data.map((row: any) => {
            const date = columnMap.has('date') ? parseDate(row[columnMap.get('date')!] || '') : '';
            const sessionType = columnMap.has('sessionType') ? (row[columnMap.get('sessionType')!] || '').trim() : '';
            const duration = columnMap.has('duration') ? parseDuration(row[columnMap.get('duration')!] || '00:00:00') : '00:00:00';
            const distance = columnMap.has('distance') ? parseNumber(row[columnMap.get('distance')!] || '0') : 0;
            
            const allureRaw = columnMap.has('avgPace') ? row[columnMap.get('avgPace')!] || '00:00' : '00:00';
            const avgPace = parseAllure(allureRaw);
            
            // Priorité à la colonne Intervalle si présente, sinon extraction depuis l'allure (rétrocompatibilité)
            let intervalStructure = '';
            if (columnMap.has('intervalStructure')) {
              intervalStructure = (row[columnMap.get('intervalStructure')!] || '').trim();
            } else if (sessionType === 'Fractionné') {
              intervalStructure = extractIntervalStructure(allureRaw);
            }
            
            const avgHeartRate = columnMap.has('avgHeartRate') ? Math.round(parseNumber(row[columnMap.get('avgHeartRate')!] || '0')) : 0;
            const comments = columnMap.has('comments') ? (row[columnMap.get('comments')!] || '').trim() : '';

            return {
              date,
              sessionType,
              duration,
              distance,
              avgPace,
              avgHeartRate,
              intervalStructure,
              comments,
            };
          }).filter(session => session.date && session.sessionType);

          if (parsedSessions.length === 0) {
            setError('Aucune séance valide trouvée dans le fichier. Vérifiez que les colonnes Date et Séance sont présentes.');
          } else {
            setPreview(parsedSessions);
          }
        } catch (err) {
          setError('Erreur lors de l\'analyse du fichier. Vérifiez le format.');
        } finally {
          setLoading(false);
        }
      },
      error: () => {
        setError('Erreur lors de la lecture du fichier.');
        setLoading(false);
      },
    });

    event.target.value = '';
  };

  const handleImport = () => {
    onImport(preview);
    setPreview([]);
    onOpenChange(false);
    toast({
      title: 'Import réussi',
      description: `${preview.length} séance(s) importée(s) avec succès.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Importer des séances depuis CSV</DialogTitle>
          <DialogDescription>
            Importez plusieurs séances en une seule fois depuis un fichier CSV ou Excel (exporté en CSV)
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {preview.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium mb-2">Sélectionnez un fichier CSV</p>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Colonnes requises :</strong> Date, Séance, Durée, Distance, Allure Cible/Moy, FC Max/Moy
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Pour les fractionnés :</strong> Ajoutez une colonne "Intervalle" (ex: 8x1'/1', TEMPO: 3x4'/2')
                </p>
              </div>
              <label htmlFor="csv-upload">
                <Button asChild variant="outline" disabled={loading}>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    {loading ? 'Chargement...' : 'Choisir un fichier'}
                  </span>
                </Button>
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {preview.length} séance(s) détectée(s)
                </p>
                <label htmlFor="csv-upload-replace">
                  <Button variant="outline" size="sm" asChild>
                    <span>Changer de fichier</span>
                  </Button>
                </label>
                <input
                  id="csv-upload-replace"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-3">
                  {preview.map((session, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-3 space-y-1 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{session.sessionType}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.date).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>⏱️ {session.duration}</div>
                        <div>📏 {session.distance.toFixed(2)} km</div>
                        <div>🏃 {session.avgPace} /km</div>
                        <div>❤️ {session.avgHeartRate} bpm</div>
                      </div>
                      {session.intervalStructure && (
                        <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          📊 {session.intervalStructure}
                        </div>
                      )}
                      {session.comments && (
                        <div className="text-xs text-muted-foreground italic">
                          {session.comments}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreview([]);
                    setError('');
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleImport}
                  className="flex-1 gradient-violet"
                >
                  Importer {preview.length} séance(s)
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
