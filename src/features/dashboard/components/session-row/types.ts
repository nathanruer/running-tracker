import type { TrainingSession } from '@/lib/types';

export interface SessionRowProps {
  session: TrainingSession;
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  isDeleting?: boolean;
  onToggleSelect?: () => void;
  onView?: (session: TrainingSession) => void;
  onPrefetchDetails?: (sessionId: string) => void;
}
