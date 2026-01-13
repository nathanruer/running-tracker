import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type TrainingSession } from '@/lib/types';
import { DatePicker } from '@/components/ui/date-picker';
import { getSessions } from '@/lib/services/api-client';
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
}

type PeriodOption = 'all' | 'week' | 'month' | 'custom';

export function ExportSessions({ selectedType, selectedSessions, allSessions, open, onOpenChange }: ExportSessionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const [mode, setMode] = useState<ExportMode>('standard');
  const [includePlanned, setIncludePlanned] = useState(false);
  const [includeWeather, setIncludeWeather] = useState(true);
  const [period, setPeriod] = useState<PeriodOption>('all');
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  /**
   * Calculate date range based on period selection
   */
  const getDateRange = (): { startDate?: Date; endDate?: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
        return { startDate: weekStart };
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: monthStart };
      }
      case 'custom': {
        return { 
          startDate: customStartDate, 
          endDate: customEndDate 
        };
      }
      case 'all':
      default:
        return {};
    }
  };

  /**
   * Handles export in any format
   */
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      let sessionsToExport: TrainingSession[];

      if (selectedSessions.size > 0) {
        sessionsToExport = allSessions.filter((s) => selectedSessions.has(s.id));
      } else {
        sessionsToExport = await getSessions(undefined, undefined, selectedType);
      }

      const dateRange = getDateRange();
      const options: ExportOptions = {
        mode,
        format,
        includePlanned,
        includeWeather,
        ...dateRange,
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

      const filename = generateExportFilename(format, mode);

      if (mode === 'standard') {
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
        // detailed mode
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
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exporter des séances</DialogTitle>
          <DialogDescription>
            Configurez les options d&apos;export et choisissez le format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Niveau de détail</Label>
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as ExportMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="mode-standard" />
                <Label htmlFor="mode-standard" className="font-normal cursor-pointer">
                  Standard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="detailed" id="mode-detailed" />
                <Label htmlFor="mode-detailed" className="font-normal cursor-pointer">
                  Détaillé
                </Label>
              </div>
            </RadioGroup>
            {mode === 'detailed' && (
              <p className="text-sm text-muted-foreground">
                Avec le détail des intervalles des séances fractionnées, au format JSON.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="period-select">Période</Label>
            <Select value={period} onValueChange={(value) => setPeriod(value as PeriodOption)}>
              <SelectTrigger id="period-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
            
            {period === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Du</Label>
                  <DatePicker
                    date={customStartDate}
                    onSelect={setCustomStartDate}
                    placeholder="Date de début"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Au</Label>
                  <DatePicker
                    date={customEndDate}
                    onSelect={setCustomEndDate}
                    placeholder="Date de fin"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Options supplémentaires</Label>
            <div className="space-y-2">
              {allSessions.some(s => s.status === 'planned') && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-planned"
                    checked={includePlanned}
                    onCheckedChange={(checked) => setIncludePlanned(checked === true)}
                  />
                  <Label htmlFor="include-planned" className="font-normal cursor-pointer">
                    Inclure les séances planifiées
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-weather"
                  checked={includeWeather}
                  onCheckedChange={(checked) => setIncludeWeather(checked === true)}
                />
                <Label htmlFor="include-weather" className="font-normal cursor-pointer">
                  Inclure la météo
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => handleExport('csv')}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => handleExport('json')}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => handleExport('excel')}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
