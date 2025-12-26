import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CsvFileUploadSectionProps {
  loading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CsvFileUploadSection({ loading, onFileSelect }: CsvFileUploadSectionProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
      <div className="text-center">
        <p className="font-medium mb-2">Sélectionnez un fichier CSV ou JSON</p>
        <p className="text-xs text-muted-foreground mb-2">
          <strong>Colonnes attendues :</strong> Date, Séance, Durée, Distance (km), Allure (mn/km), FC moyenne, RPE, Commentaires
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          <strong>Note :</strong> La colonne &quot;Intervalles&quot; est nécessaire uniquement pour les séances de fractionné (ex: 8x1&apos;/1&apos;)
        </p>
      </div>
      <label htmlFor="csv-upload">
        <Button asChild variant="outline" disabled={loading}>
          <span>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? 'Chargement...' : 'Choisir un fichier'}
          </span>
        </Button>
      </label>
      <input
        id="csv-upload"
        type="file"
        accept=".csv,.txt,.json"
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  );
}
