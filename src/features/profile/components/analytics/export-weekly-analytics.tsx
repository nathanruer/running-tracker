import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WeeklyData {
  semaine: string;
  km: number | null;
  completedCount: number;
  changePercent: number | null;
  plannedKm?: number;
  plannedCount?: number;
  totalWithPlanned?: number | null;
  changePercentWithPlanned?: number | null;
}

interface ExportWeeklyAnalyticsProps {
  data: WeeklyData[];
}

export function ExportWeeklyAnalytics({ data }: ExportWeeklyAnalyticsProps) {
  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'Semaine',
      'Distance réalisée (km)',
      'Séances réalisées',
      'Évolution (%)',
    ];

    const rows = data.map((week) => {
      const hasCompleted = week.km !== null && week.km > 0;
      const hasPlanned = week.plannedKm !== undefined && week.plannedKm > 0;

      let distance = '';
      let evolution = '';

      if (hasCompleted && hasPlanned) {
        distance = `${week.km} (total prévu: ${week.totalWithPlanned})`;
        evolution = week.changePercentWithPlanned !== null && week.changePercentWithPlanned !== undefined
          ? `${week.changePercentWithPlanned > 0 ? '+' : ''}${week.changePercentWithPlanned.toFixed(1)}`
          : '';
      } else if (hasCompleted) {
        distance = week.km!.toString();
        evolution = week.changePercent !== null
          ? `${week.changePercent > 0 ? '+' : ''}${week.changePercent.toFixed(1)}`
          : '';
      } else if (hasPlanned) {
        distance = `${week.plannedKm} (prévu)`;
        evolution = week.changePercentWithPlanned !== null && week.changePercentWithPlanned !== undefined
          ? `${week.changePercentWithPlanned > 0 ? '+' : ''}${week.changePercentWithPlanned.toFixed(1)}`
          : '';
      }

      return [
        week.semaine,
        distance,
        week.completedCount.toString(),
        evolution,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analyse_hebdomadaire_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (data.length === 0) return;

    const exportData = data.map((week) => {
      const hasCompleted = week.km !== null && week.km > 0;
      const hasPlanned = week.plannedKm !== undefined && week.plannedKm > 0;

      if (hasCompleted && hasPlanned) {
        return {
          semaine: week.semaine,
          distance_realisee_km: week.km,
          seances_realisees: week.completedCount,
          distance_totale_prevue_km: week.totalWithPlanned,
          seances_prevues_restantes: week.plannedCount || 0,
          evolution_pourcent: week.changePercentWithPlanned,
        };
      }

      if (hasCompleted) {
        return {
          semaine: week.semaine,
          distance_realisee_km: week.km,
          seances_realisees: week.completedCount,
          evolution_pourcent: week.changePercent,
        };
      }

      if (hasPlanned) {
        return {
          semaine: week.semaine,
          distance_prevue_km: week.plannedKm,
          seances_prevues: week.plannedCount || 0,
          evolution_pourcent: week.changePercentWithPlanned,
        };
      }

      return {
        semaine: week.semaine,
        evolution_pourcent: null,
      };
    });

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analyse_hebdomadaire_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (data.length === 0) return;

    const headers = [
      'Semaine',
      'Distance réalisée (km)',
      'Séances réalisées',
      'Évolution (%)',
    ];

    const rows = data.map((week) => {
      const hasCompleted = week.km !== null && week.km > 0;
      const hasPlanned = week.plannedKm !== undefined && week.plannedKm > 0;

      let distance = '';
      let evolution = '';

      if (hasCompleted && hasPlanned) {
        distance = `${week.km} (total prévu: ${week.totalWithPlanned})`;
        evolution = week.changePercentWithPlanned !== null && week.changePercentWithPlanned !== undefined
          ? `${week.changePercentWithPlanned > 0 ? '+' : ''}${week.changePercentWithPlanned.toFixed(1)}`
          : '';
      } else if (hasCompleted) {
        distance = week.km!.toString();
        evolution = week.changePercent !== null
          ? `${week.changePercent > 0 ? '+' : ''}${week.changePercent.toFixed(1)}`
          : '';
      } else if (hasPlanned) {
        distance = `${week.plannedKm} (prévu)`;
        evolution = week.changePercentWithPlanned !== null && week.changePercentWithPlanned !== undefined
          ? `${week.changePercentWithPlanned > 0 ? '+' : ''}${week.changePercentWithPlanned.toFixed(1)}`
          : '';
      }

      return [
        week.semaine,
        distance,
        week.completedCount.toString(),
        evolution,
      ];
    });

    const tsvContent = [
      headers.join('\t'),
      ...rows.map((row) => row.join('\t')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + tsvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analyse_hebdomadaire_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
