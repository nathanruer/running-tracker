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
  { name: 'Z1 - Récup / Très facile', minPct: 0.60, maxPct: 0.68, minVmaPct: 0.50, maxVmaPct: 0.60 },
  { name: 'Z2 - Endurance base', minPct: 0.68, maxPct: 0.75, minVmaPct: 0.60, maxVmaPct: 0.70 },
  { name: 'Z2+ - Endurance haute', minPct: 0.75, maxPct: 0.80, minVmaPct: 0.70, maxVmaPct: 0.75 },
  { name: 'Z3 - Tempo / Seuil aéro', minPct: 0.80, maxPct: 0.88, minVmaPct: 0.75, maxVmaPct: 0.85 },
  { name: 'Z4 - Seuil anaérobie', minPct: 0.88, maxPct: 0.92, minVmaPct: 0.85, maxVmaPct: 0.95 },
  { name: 'Z5 - VMA / Sprint', minPct: 0.92, maxPct: 1.00, minVmaPct: 0.95, maxVmaPct: 1.05 },
];

const calculatePace = (vma: number, percentage: number): string => {
  const speed = vma * percentage;
  const pace = 60 / speed; // mn/km
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
    <Card className="md:col-span-2 border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Zones d&apos;entraînement</CardTitle>
        <CardDescription>
          Calculées selon votre FC Max ({maxHeartRate || '--'} bpm) et VMA ({vma || '--'} km/h).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-widest py-4">Zone</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-widest py-4">% FCM</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-widest py-4">FC Cible</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-widest py-4">Allure approx.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ZONES.map((zone, index) => {
                let bpmRange = '--';
                if (maxHeartRate && !isNaN(Number(maxHeartRate))) {
                  const minBpm = Math.round(Number(maxHeartRate) * zone.minPct);
                  const maxBpm = Math.round(Number(maxHeartRate) * zone.maxPct);
                  bpmRange = `${minBpm}–${maxBpm} bpm`;
                }

                let paceRange = '--';
                if (vma && !isNaN(Number(vma))) {
                  const minPace = calculatePace(Number(vma), zone.maxVmaPct);
                  const maxPace = calculatePace(Number(vma), zone.minVmaPct);
                  paceRange = `${minPace}-${maxPace} /km`;
                }

                return (
                  <TableRow key={index}>
                    <TableCell className="py-4">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {zone.name}
                       </span>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {Math.round(zone.minPct * 100)}–{Math.round(zone.maxPct * 100)}%
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">{bpmRange}</TableCell>
                    <TableCell className="text-muted-foreground font-medium tabular-nums">
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
