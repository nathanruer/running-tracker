import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type TrainingSession } from '@/lib/types';

interface ExportSessionsProps {
  sessions: TrainingSession[];
}

export function ExportSessions({ sessions }: ExportSessionsProps) {
  const exportToCSV = () => {
    const completedSessions = sessions.filter((s) => s.status === 'completed' && s.date);
    if (completedSessions.length === 0) return;

    const headers = [
      'Numéro',
      'Semaine',
      'Date',
      'Type de séance',
      'Durée',
      'Distance (km)',
      'Allure (min/km)',
      'FC moyenne (bpm)',
      'RPE',
      'Structure intervalle',
      'Commentaires',
    ];

    const rows = completedSessions.map((session) => [
      session.sessionNumber,
      session.week,
      new Date(session.date!).toLocaleDateString('fr-FR'),
      session.sessionType,
      session.duration || '',
      session.distance || '',
      session.avgPace || '',
      session.avgHeartRate || '',
      session.perceivedExertion || '',
      session.intervalStructure || '',
      session.comments || '',
    ]);

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
    link.setAttribute('download', `seances_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const completedSessions = sessions.filter((s) => s.status === 'completed' && s.date);
    if (completedSessions.length === 0) return;

    const cleanedSessions = completedSessions.map((session) => ({
      numero: session.sessionNumber,
      semaine: session.week,
      date: new Date(session.date!).toLocaleDateString('fr-FR'),
      type: session.sessionType,
      duree: session.duration || '',
      distance_km: session.distance || 0,
      allure_min_km: session.avgPace || '',
      fc_moyenne_bpm: session.avgHeartRate || 0,
      rpe: session.perceivedExertion || null,
      structure_intervalle: session.intervalStructure || null,
      commentaires: session.comments || null,
    }));

    const jsonContent = JSON.stringify(cleanedSessions, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `seances_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const completedSessions = sessions.filter((s) => s.status === 'completed' && s.date);
    if (completedSessions.length === 0) return;

    const headers = [
      'Numéro',
      'Semaine',
      'Date',
      'Type de séance',
      'Durée',
      'Distance (km)',
      'Allure (min/km)',
      'FC moyenne (bpm)',
      'RPE',
      'Structure intervalle',
      'Commentaires',
    ];

    const rows = completedSessions.map((session) => [
      session.sessionNumber,
      session.week,
      new Date(session.date!).toLocaleDateString('fr-FR'),
      session.sessionType,
      session.duration || '',
      session.distance || '',
      session.avgPace || '',
      session.avgHeartRate || '',
      session.perceivedExertion || '',
      session.intervalStructure || '',
      session.comments || '',
    ]);

    const tsvContent = [
      headers.join('\t'),
      ...rows.map((row) => row.join('\t')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + tsvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `seances_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={sessions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background">
        <DropdownMenuItem onClick={exportToCSV} className="bg-background hover:bg-accent cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} className="bg-background hover:bg-accent cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="bg-background hover:bg-accent cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
