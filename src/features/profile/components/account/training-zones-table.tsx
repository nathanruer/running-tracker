import {
  Card,
  CardContent,
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
    <Card className="md:col-span-2 border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
    <CardHeader className="p-4 md:p-6 pb-2">
        <CardTitle className="text-xl font-semibold">Zones d&apos;entraînement</CardTitle>
        <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
          {maxHeartRate && vma ? (
            <>Calculées selon votre FC Max ({maxHeartRate} bpm) et VMA ({vma} km/h)</>
          ) : maxHeartRate ? (
            <>Calculées selon votre FC Max ({maxHeartRate} bpm). <span className="italic">Renseignez votre VMA pour plus de précision.</span></>
          ) : vma ? (
            <>Calculées selon votre VMA ({vma} km/h). <span className="italic">Renseignez votre FC Max pour plus de précision.</span></>
          ) : (
            <span className="italic">Renseignez votre FC Max et VMA pour voir vos zones personnalisées.</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] md:text-xs font-bold uppercase tracking-widest py-3 md:py-4 px-2 md:px-4">Zone</TableHead>
                <TableHead className="text-[10px] md:text-xs font-bold uppercase tracking-widest py-3 md:py-4 px-2 md:px-4 text-center">% FC</TableHead>
                <TableHead className="text-[10px] md:text-xs font-bold uppercase tracking-widest py-3 md:py-4 px-2 md:px-4 text-center">BPM</TableHead>
                <TableHead className="text-[10px] md:text-xs font-bold uppercase tracking-widest py-3 md:py-4 px-2 md:px-4 text-center hidden sm:table-cell">Allure approx.</TableHead>
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
                    <TableCell className="py-3 md:py-4 px-2 md:px-4">
                       <div className="flex flex-col">
                        <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-tight text-foreground">
                          {zone.name.split(' - ')[0]}
                        </span>
                        <span className="text-[9px] font-medium text-muted-foreground hidden md:inline">
                          {zone.name.split(' - ')[1]}
                        </span>
                       </div>
                    </TableCell>
                    <TableCell className="py-3 md:py-4 px-2 md:px-4 font-semibold tabular-nums text-center text-xs md:text-sm">
                      {Math.round(zone.minPct * 100)}–{Math.round(zone.maxPct * 100)}%
                    </TableCell>
                    <TableCell className="py-3 md:py-4 px-2 md:px-4 font-semibold tabular-nums text-center text-xs md:text-sm">
                      {bpmRange === '--' ? (
                        <span className="text-muted-foreground/30 font-normal">—</span>
                      ) : (
                        bpmRange.replace(' bpm', '')
                      )}
                    </TableCell>
                    <TableCell className="py-3 md:py-4 px-2 md:px-4 text-muted-foreground font-medium tabular-nums text-center text-xs md:text-sm hidden sm:table-cell">
                      {paceRange === '--' ? (
                        <span className="text-muted-foreground/30 font-normal">—</span>
                      ) : (
                        paceRange
                      )}
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
