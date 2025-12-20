import { FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IntervalImportSectionProps {
  onTcxClick: () => void;
  onCsvClick: () => void;
}

export function IntervalImportSection({
  onTcxClick,
  onCsvClick,
}: IntervalImportSectionProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Importer les intervalles
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onTcxClick}
        >
          <FileText className="mr-2 h-4 w-4" />
          TCX
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCsvClick}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>
    </div>
  );
}
