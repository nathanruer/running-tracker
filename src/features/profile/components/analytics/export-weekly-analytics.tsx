import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
      <DropdownMenuContent align="end" className="bg-background">
        <DropdownMenuItem data-testid="export-csv" onClick={exportToCSV} className="bg-background hover:bg-accent cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="export-json" onClick={exportToJSON} className="bg-background hover:bg-accent cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="export-excel" onClick={exportToExcel} className="bg-background hover:bg-accent cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

