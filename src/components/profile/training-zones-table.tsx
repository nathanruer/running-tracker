import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ZONES = [
  { name: 'Récup / Très facile', minPct: 0.60, maxPct: 0.68, minVmaPct: 0.50, maxVmaPct: 0.60 },
  { name: 'EF Zone 2 (base)', minPct: 0.68, maxPct: 0.75, minVmaPct: 0.60, maxVmaPct: 0.70 },
  { name: 'EF Zone 2 haute', minPct: 0.75, maxPct: 0.80, minVmaPct: 0.70, maxVmaPct: 0.75 },
  { name: 'Tempo / Seuil aérobie', minPct: 0.80, maxPct: 0.88, minVmaPct: 0.75, maxVmaPct: 0.85 },
  { name: 'Seuil anaérobie', minPct: 0.88, maxPct: 0.92, minVmaPct: 0.85, maxVmaPct: 0.95 },
  { name: 'VMA / Intervalles courts', minPct: 0.92, maxPct: 1.00, minVmaPct: 0.95, maxVmaPct: 1.05 },
];

const calculatePace = (vma: number, percentage: number): string => {
  const speed = vma * percentage;
  const pace = 60 / speed; // min/km
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface TrainingZonesTableProps {
  maxHeartRate?: number;
  vma?: number;
}

export function TrainingZonesTable({ maxHeartRate, vma }: TrainingZonesTableProps) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Zones d&apos;entraînement</CardTitle>
        <CardDescription>
          Calculées sur la base de votre FC Max ({maxHeartRate || '--'} bpm) et VMA ({vma || '--'} km/h).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>% FCM</TableHead>
                <TableHead>FC cible</TableHead>
                <TableHead>Allure approx.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ZONES.map((zone, index) => {
                let bpmRange = '--';
                if (maxHeartRate && !isNaN(Number(maxHeartRate))) {
                  const minBpm = Math.round(Number(maxHeartRate) * zone.minPct);
                  const maxBpm = Math.round(Number(maxHeartRate) * zone.maxPct);
                  bpmRange = `${minBpm}–${maxBpm}`;
                }

                let paceRange = '--';
                if (vma && !isNaN(Number(vma))) {
                  const minPace = calculatePace(Number(vma), zone.maxVmaPct);
                  const maxPace = calculatePace(Number(vma), zone.minVmaPct);
                  paceRange = `${minPace}-${maxPace}`;
                }

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell>
                      {Math.round(zone.minPct * 100)}–{Math.round(zone.maxPct * 100)}%
                    </TableCell>
                    <TableCell>{bpmRange}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {paceRange}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
