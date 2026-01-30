import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WeeklyChartDataPoint } from '@/lib/domain/analytics/weekly-calculator';
import { 
  formatWeeklyData, 
  generateWeeklyCSV, 
  generateWeeklyJSON, 
  generateWeeklyXLSX 
} from '@/lib/utils/export/weekly-export';

interface ExportWeeklyAnalyticsProps {
  data: WeeklyChartDataPoint[];
}

export function ExportWeeklyAnalytics({ data }: ExportWeeklyAnalyticsProps) {
  const downloadFile = (content: string | Blob, filename: string, mimeType: string) => {
    const blob = content instanceof Blob 
      ? content 
      : new Blob([mimeType.includes('csv') ? '\ufeff' + content : content], { type: `${mimeType};charset=utf-8;` });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    const formattedData = formatWeeklyData(data);
    const csvContent = generateWeeklyCSV(formattedData);
    downloadFile(
      csvContent, 
      `analyse_hebdomadaire_${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
  };

  const exportToJSON = () => {
    if (data.length === 0) return;
    const formattedData = formatWeeklyData(data);
    const jsonContent = generateWeeklyJSON(formattedData);
    downloadFile(
      jsonContent, 
      `analyse_hebdomadaire_${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  };

  const exportToExcel = () => {
    if (data.length === 0) return;
    const formattedData = formatWeeklyData(data);
    const excelBlob = generateWeeklyXLSX(formattedData);
    downloadFile(
      excelBlob, 
      `analyse_hebdomadaire_${new Date().toISOString().split('T')[0]}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          data-testid="btn-analytics-export"
          variant="ghost" 
          size="sm"
          disabled={data.length === 0}
          className="h-9 px-2 sm:px-4 text-xs font-bold text-muted-foreground/60 hover:bg-white/5 hover:text-foreground active:scale-95 transition-all rounded-xl border-none"
        >
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Exporter</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Format d&apos;export</DropdownMenuLabel>
        <DropdownMenuItem onClick={exportToCSV}>
          <Download className="h-4 w-4" />
          Fichier CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <Download className="h-4 w-4" />
          Fichier JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <Download className="h-4 w-4" />
          Fichier Excel (XLSX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

