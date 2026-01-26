import { useState, useEffect } from 'react';
import { Download, Loader2, FileText, Code, Table, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { type TrainingSession } from '@/lib/types';
import { useProgressiveExport } from '../hooks/use-progressive-export';
import {
  type ExportMode,
  type ExportFormat,
  type ExportOptions,
  filterSessions,
  formatSessionsStandard,
  formatSessionsDetailed,
  formatSessionsStandardJSON,
  formatSessionsDetailedJSON,
  getStandardHeaders,
  getDetailedHeaders,
  generateCSV,
  generateXLSX,
  generateJSON,
  downloadFile,
  downloadBlob,
  generateExportFilename,
} from '@/lib/utils/export/session-export';

interface ExportSessionsProps {
  selectedType: string;
  selectedSessions: Set<string>;
  allSessions: TrainingSession[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery?: string;
  dateFrom?: string;
}

export function ExportSessions({ 
  selectedType, 
  selectedSessions, 
  allSessions, 
  open, 
  onOpenChange,
  searchQuery,
  dateFrom,
}: ExportSessionsProps) {
  const { toast } = useToast();
  const { exportProgress, fetchAllSessionsWithProgress, resetProgress } = useProgressiveExport();

  const [includeIntervals, setIncludeIntervals] = useState(true);
  const [includePlanned, setIncludePlanned] = useState(false);
  const [includeWeather, setIncludeWeather] = useState(true);
  
  useEffect(() => {
    if (!open) {
      resetProgress();
    }
  }, [open, resetProgress]);

  const handleExport = async (format: ExportFormat) => {
    try {
      let sessionsToExport: TrainingSession[];

      if (selectedSessions.size > 0) {
        sessionsToExport = allSessions.filter((s) => selectedSessions.has(s.id));
      } else {
        sessionsToExport = await fetchAllSessionsWithProgress(
          selectedType !== 'all' ? selectedType : undefined,
          searchQuery,
          dateFrom
        );
      }

      const exportMode: ExportMode = includeIntervals ? 'detailed' : 'standard';

      const options: ExportOptions = {
        mode: exportMode,
        format,
        includePlanned,
        includeWeather,
      };

      const filteredSessions = filterSessions(sessionsToExport, options);

      if (filteredSessions.length === 0) {
        toast({
          title: 'Aucune séance à exporter',
          description: 'Aucune séance ne correspond aux critères sélectionnés.',
          variant: 'destructive',
        });
        return;
      }

      const filename = generateExportFilename(format, exportMode);

      if (exportMode === 'standard') {
        if (format === 'json') {
          const rows = formatSessionsStandardJSON(filteredSessions, includeWeather);
          const content = generateJSON(rows);
          downloadFile(content, filename, 'application/json');
        } else {
          const rows = formatSessionsStandard(filteredSessions, includeWeather);
          const headers = getStandardHeaders(includeWeather);

          if (format === 'csv') {
            const content = generateCSV(headers, rows);
            downloadFile(content, filename, 'text/csv');
          } else {
            const blob = generateXLSX(headers, rows);
            downloadBlob(blob, filename);
          }
        }
      } else {
        if (format === 'json') {
          const rows = formatSessionsDetailedJSON(filteredSessions, includeWeather);
          const content = generateJSON(rows);
          downloadFile(content, filename, 'application/json');
        } else {
          const rows = formatSessionsDetailed(filteredSessions, includeWeather);
          const headers = getDetailedHeaders(includeWeather);

          if (format === 'csv') {
            const content = generateCSV(headers, rows);
            downloadFile(content, filename, 'text/csv');
          } else {
            const blob = generateXLSX(headers, rows);
            downloadBlob(blob, filename);
          }
        }
      }

      onOpenChange(false);
    } catch {
      toast({
        title: 'Erreur d\'export',
        description: 'Une erreur est survenue lors de l\'export. Veuillez réessayer.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="sm:max-w-[550px] p-0 overflow-hidden w-[95vw] md:w-full">
        <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8 pt-4 md:pt-6 space-y-6 md:space-y-8 scrollbar-custom">
          <DialogHeader className="relative w-full items-start text-left flex flex-col pt-2">
            <div className="flex w-full items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {selectedSessions.size > 0 ? "Exporter la sélection" : "Exporter l'historique"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground/60 font-medium">
                  Configurez vos préférences pour récupérer vos données.
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {selectedSessions.size > 0 ? (
              <div className="flex items-center gap-3 p-3.5 bg-violet-600/[0.03] border border-violet-600/10 rounded-xl">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/10">
                  <span className="text-[11px] font-black text-violet-600">{selectedSessions.size}</span>
                </div>
                <p className="text-[11px] text-violet-600/80 font-bold uppercase tracking-wider">
                  {selectedSessions.size === 1 ? 'séance sélectionnée' : 'séances sélectionnées'}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3.5 bg-muted/20 border border-border/40 rounded-xl">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/20">
                  <Download className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
                <p className="text-[11px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                  Toutes les séances (filtres actifs)
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-3 bg-muted/5 p-4 rounded-2xl border border-border/30">
                <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 ml-px">
                  Options
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'include-intervals', checked: includeIntervals, onChange: setIncludeIntervals, label: 'Détails intervalles' },
                    { id: 'include-weather', checked: includeWeather, onChange: setIncludeWeather, label: 'Données météo' },
                  ].map((opt) => (
                    <Label 
                      key={opt.id} 
                      htmlFor={opt.id}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-xl transition-all group cursor-pointer border border-transparent",
                        opt.checked ? "bg-violet-600/10 border-violet-600/20" : "hover:bg-muted/20"
                      )}
                    >
                      <Checkbox
                        id={opt.id}
                        checked={opt.checked}
                        onCheckedChange={(checked) => opt.onChange(checked === true)}
                        className="h-4 w-4 border-border/60 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 data-[state=checked]:text-white"
                      />
                      <span
                        className={cn(
                          "text-xs font-semibold cursor-pointer transition-colors",
                          opt.checked ? "text-violet-600" : "text-muted-foreground/80 group-hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </span>
                    </Label>
                  ))}

                  {allSessions.some(s => s.status === 'planned') && (
                    <Label 
                      htmlFor="include-planned"
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-xl transition-all group cursor-pointer border border-transparent sm:col-span-2",
                        includePlanned ? "bg-violet-600/10 border-violet-600/20" : "hover:bg-muted/20"
                      )}
                    >
                      <Checkbox
                        id="include-planned"
                        checked={includePlanned}
                        onCheckedChange={(checked) => setIncludePlanned(checked === true)}
                        className="h-4 w-4 border-border/60 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 data-[state=checked]:text-white"
                      />
                      <span
                        className={cn(
                          "text-xs font-semibold cursor-pointer transition-colors",
                          includePlanned ? "text-violet-600" : "text-muted-foreground/80 group-hover:text-foreground"
                        )}
                      >
                        Inclure les séances planifiées
                      </span>
                    </Label>
                  )}
                </div>
              </div>

              {exportProgress.isExporting && (
                <div className="space-y-3 p-4 bg-foreground/[0.02] rounded-2xl border border-border/20 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2 text-foreground/60 font-bold uppercase tracking-widest">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Génération...
                    </div>
                    <span className="font-mono text-foreground/40">
                      {exportProgress.loadedCount} / {exportProgress.totalCount}
                    </span>
                  </div>
                  <div className="relative h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground/60 transition-all duration-500 ease-out rounded-full"
                      style={{ width: `${exportProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 ml-px">
                  Format de fichier
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'csv', label: 'CSV', icon: FileText },
                    { id: 'json', label: 'JSON', icon: Code },
                    { id: 'excel', label: 'EXCEL', icon: Table },
                  ].map((format) => (
                    <Button
                      key={format.id}
                      className="flex flex-col items-center justify-center h-20 gap-2 rounded-xl border border-border/30 bg-muted/5 transition-all active:scale-[0.97] group hover:bg-muted/20 hover:border-border/60"
                      variant="ghost"
                      onClick={() => handleExport(format.id as ExportFormat)}
                      disabled={exportProgress.isExporting}
                    >
                      <format.icon className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                      <span className="text-[10px] font-bold tracking-wider text-muted-foreground/60 group-hover:text-foreground">{format.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
