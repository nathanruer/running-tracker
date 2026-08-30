'use client';

import { Activity } from 'lucide-react';

interface SourceBadgeProps {
  className?: string;
}

/** Attribution of the activity source (intervals.icu). */
export function SourceBadge({ className = '' }: SourceBadgeProps) {
  return (
    <a
      href="https://intervals.icu"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-xs font-medium text-muted-foreground opacity-70 hover:opacity-100 transition-opacity ${className}`}
      title="Données intervals.icu"
    >
      <Activity className="h-4 w-4 text-violet-500" />
      <span>Données intervals.icu</span>
    </a>
  );
}
