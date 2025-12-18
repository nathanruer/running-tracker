'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

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
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ParsedSession {
  date: string;
  sessionType: string;
  duration: string;
  distance: number;
  avgPace: string;
  avgHeartRate: number;
  perceivedExertion?: number;
  comments: string;
  intervalDetails?: string | null;
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (sessions: ParsedSession[]) => Promise<void>;
  onCancel?: () => void;
  isImporting?: boolean;
  mode?: 'create' | 'edit' | 'complete';
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImport,
  onCancel,
  isImporting = false,
  mode = 'create',
}: CsvImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedSession[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
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
      } else if (normalizedHeader.includes('rpe') || normalizedHeader === 'effort') {
        columnMap.set('perceivedExertion', header);
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
    setSortColumn(null);
    setSortDirection(null);

    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          const sessionsArray = Array.isArray(data) ? data : [data];
          
          const parsedSessions: ParsedSession[] = sessionsArray.map((row: Record<string, unknown>) => {
            const dateStr = String(row.date || row.Date || '');
            const sessionType = String(row.sessionType || row.type || row['Type de séance'] || '').trim();
            const duration = parseDuration(String(row.duration || row.duree || row['Durée'] || '00:00:00'));
            const distance = parseNumber(String(row.distance || row.distance_km || row['Distance (km)'] || '0'));

            const allureRaw = String(row.avgPace || row.allure_min_km || row['Allure (mn/km)'] || '00:00');
            const avgPace = parseAllure(allureRaw);

            const avgHeartRate = Math.round(parseNumber(String(row.avgHeartRate || row.fc_moyenne_bpm || row['FC moyenne (bpm)'] || '0')));
            const perceivedExertion = row.perceivedExertion || row.rpe ? Math.round(parseNumber(String(row.perceivedExertion || row.rpe || 0))) : undefined;
            const comments = String(row.comments || row.commentaires || '').trim();

            let intervalDetails: string | null = null;
            const intervalDetailsRaw = row.intervalDetails || row.details_intervalle || null;
            if (intervalDetailsRaw) {
              intervalDetails = typeof intervalDetailsRaw === 'string' ? intervalDetailsRaw : JSON.stringify(intervalDetailsRaw);
            } else if (row.structure_intervalle) {
              intervalDetails = String(row.structure_intervalle);
            }

            return {
              date: parseDate(dateStr),
              sessionType,
              duration,
              distance,
              avgPace,
              avgHeartRate,
              perceivedExertion,
              comments,
              intervalDetails
            };
          }).filter(session => session.date && session.sessionType);

          if (parsedSessions.length === 0) {
            setError('Aucune séance valide trouvée dans le fichier JSON.');
          } else {
            setPreview(parsedSessions);
            setSelectedIndices(new Set(parsedSessions.map((_, i) => i)));
          }
        } catch (err) {
          console.error(err);
          setError('Erreur lors de la lecture du fichier JSON.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const columnMap = detectColumns(headers);

          const parsedSessions: ParsedSession[] = (results.data as Record<string, string>[]).map((row) => {
            const date = columnMap.has('date') ? parseDate(row[columnMap.get('date')!] || '') : '';
            const sessionType = columnMap.has('sessionType') ? (row[columnMap.get('sessionType')!] || '').trim() : '';
            const duration = columnMap.has('duration') ? parseDuration(row[columnMap.get('duration')!] || '00:00:00') : '00:00:00';
            const distance = columnMap.has('distance') ? parseNumber(row[columnMap.get('distance')!] || '0') : 0;

            const allureRaw = columnMap.has('avgPace') ? row[columnMap.get('avgPace')!] || '00:00' : '00:00';
            const avgPace = parseAllure(allureRaw);

            let intervalDetails: string | null = null;
            if (columnMap.has('intervalStructure')) {
              const structureStr = (row[columnMap.get('intervalStructure')!] || '').trim();
              if (structureStr) {
                intervalDetails = structureStr;
              }
            }

            const avgHeartRate = columnMap.has('avgHeartRate') ? Math.round(parseNumber(row[columnMap.get('avgHeartRate')!] || '0')) : 0;
            const rpeValue = columnMap.has('perceivedExertion') ? (row[columnMap.get('perceivedExertion')!] || '').trim() : '';
            const perceivedExertion = rpeValue ? Math.round(parseNumber(rpeValue)) : undefined;
            const comments = columnMap.has('comments') ? (row[columnMap.get('comments')!] || '').trim() : '';

            return {
              date,
              sessionType,
              duration,
              distance,
              avgPace,
              avgHeartRate,
              perceivedExertion,
              comments,
              intervalDetails
            };
          }).filter(session => session.date && session.sessionType);

          if (parsedSessions.length === 0) {
            setError('Aucune séance valide trouvée dans le fichier. Vérifiez que les colonnes Date et Séance sont présentes.');
          } else {
            setPreview(parsedSessions);
            setSelectedIndices(new Set(parsedSessions.map((_, i) => i)));
          }
        } catch {
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

  const handleImport = async () => {
    const selectedSessions = preview.filter((_, i) => selectedIndices.has(i));

    if (selectedSessions.length === 0) {
      toast({
        title: 'Aucune séance sélectionnée',
        description: 'Veuillez sélectionner au moins une séance à importer.',
        variant: 'destructive',
      });
      return;
    }

    await onImport(selectedSessions);
    
    setPreview([]);
    setSelectedIndices(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === preview.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(preview.map((_, i) => i)));
    }
  };

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      if (mode === 'complete') {
        newSelected.clear();
      }
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortedPreview = () => {
    if (!sortColumn || !sortDirection) {
      return [...preview].reverse();
    }

    const sorted = [...preview].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'sessionType':
          aValue = a.sessionType.toLowerCase();
          bValue = b.sessionType.toLowerCase();
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'distance':
          aValue = a.distance;
          bValue = b.distance;
          break;
        case 'avgPace':
          const parseAvgPace = (pace: string) => {
            const [min, sec] = pace.split(':').map(Number);
            return (min || 0) * 60 + (sec || 0);
          };
          aValue = parseAvgPace(a.avgPace);
          bValue = parseAvgPace(b.avgPace);
          break;
        case 'avgHeartRate':
          aValue = a.avgHeartRate;
          bValue = b.avgHeartRate;
          break;
        case 'perceivedExertion':
          aValue = a.perceivedExertion || 0;
          bValue = b.perceivedExertion || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="mr-2 h-4 w-4" />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="mr-2 h-4 w-4 text-foreground" />;
    }
    return <ChevronUp className="mr-2 h-4 w-4 text-foreground" />;
  };


  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val && onCancel) onCancel();
    }}>
      <DialogContent className={`max-h-xl overflow-hidden ${preview.length === 0 ? 'sm:max-w-2xl' : 'sm:max-w-6xl'}`}>
        <DialogHeader>
          <DialogTitle>Importer des séances (CSV ou JSON)</DialogTitle>
          <DialogDescription>
            {mode === 'complete'
              ? "Importez les données d'une séance depuis un fichier CSV ou JSON"
              : 'Importez plusieurs séances en une seule fois depuis un fichier CSV, Excel (exporté en CSV) ou JSON'}
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
                <p className="font-medium mb-2">Sélectionnez un fichier CSV ou JSON</p>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Colonnes attendues :</strong> Date, Séance, Durée, Distance (km), Allure (mn/km), FC moyenne, RPE, Commentaires
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  <strong>Note :</strong> La colonne &quot;Intervalles&quot; est nécessaire uniquement pour les séances de fractionné (ex: 8x1&apos;/1&apos;)
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
                accept=".csv,.txt,.json"
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
                <div className="flex gap-2">
                  {mode !== 'complete' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                    >
                      {selectedIndices.size === preview.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </Button>
                  )}
                  <label htmlFor="csv-upload-replace">
                    <Button variant="outline" size="sm" asChild>
                      <span>Changer de fichier</span>
                    </Button>
                  </label>
                  <input
                    id="csv-upload-replace"
                    type="file"
                    accept=".csv,.txt,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
              
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        {mode !== 'complete' && (
                          <Checkbox
                            checked={preview.length > 0 && selectedIndices.size === preview.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        )}
                      </TableHead>
                      <TableHead className="text-center">Date</TableHead>
                      <TableHead className="text-center">Séance</TableHead>
                      <TableHead className="text-center">
                        <button 
                          onClick={() => handleSort('duration')}
                          className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                        >
                          <SortIcon column="duration" />
                          <span className={sortColumn === 'duration' ? 'text-foreground' : ''}>Durée</span>
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button 
                          onClick={() => handleSort('distance')}
                          className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                        >
                          <SortIcon column="distance" />
                          <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Distance</span>
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button 
                          onClick={() => handleSort('avgPace')}
                          className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                        >
                          <SortIcon column="avgPace" />
                          <span className={sortColumn === 'avgPace' ? 'text-foreground' : ''}>Allure</span>
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button 
                          onClick={() => handleSort('avgHeartRate')}
                          className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                        >
                          <SortIcon column="avgHeartRate" />
                          <span className={sortColumn === 'avgHeartRate' ? 'text-foreground' : ''}>FC</span>
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button 
                          onClick={() => handleSort('perceivedExertion')}
                          className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                        >
                          <SortIcon column="perceivedExertion" />
                          <span className={sortColumn === 'perceivedExertion' ? 'text-foreground' : ''}>RPE</span>
                        </button>
                      </TableHead>
                      <TableHead>Commentaires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedPreview().map((session) => {
                      const originalIndex = preview.findIndex(s => s === session);
                      return (
                        <TableRow 
                          key={originalIndex}
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
                            {new Date(session.date).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span>{session.sessionType}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{session.duration}</TableCell>
                          <TableCell className="text-center">{session.distance.toFixed(2)} km</TableCell>
                          <TableCell className="text-center">{session.avgPace}</TableCell>
                          <TableCell className="text-center">{session.avgHeartRate}</TableCell>
                          <TableCell className="text-center">
                            {session.perceivedExertion ? (
                              <span className={
                                session.perceivedExertion <= 3 ? 'text-green-500' :
                                session.perceivedExertion <= 6 ? 'text-yellow-500' :
                                session.perceivedExertion <= 8 ? 'text-orange-500' :
                                'text-red-500 font-bold'
                              }>
                                {session.perceivedExertion}/10
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate text-xs text-muted-foreground" title={session.comments}>
                              {session.comments}
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreview([]);
                    setError('');
                  }}
                  className="flex-1"
                  disabled={isImporting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleImport}
                  className="flex-1 gradient-violet"
                  disabled={isImporting || selectedIndices.size === 0}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    `Importer ${selectedIndices.size} séance(s)`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
