'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { SectionTitle } from './section-title';

interface EnrichmentPromptProps {
  sectionTitle: string;
  title: string;
  description: string;
  loadingLabel: string;
  isLoading: boolean;
  onEnrich: () => void;
  testId: string;
}

export function EnrichmentPrompt({
  sectionTitle,
  title,
  description,
  loadingLabel,
  isLoading,
  onEnrich,
  testId,
}: EnrichmentPromptProps) {
  return (
    <div className="space-y-4">
      <SectionTitle className="flex items-center gap-2">{sectionTitle}</SectionTitle>
      <div className="rounded-2xl border border-border/40 bg-muted/40 dark:bg-white/[0.03] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all">
        <div className="flex items-center gap-5 text-sm">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="text-foreground font-black uppercase tracking-[0.15em] text-[11px]">{title}</div>
            <div className="text-xs text-muted-foreground/70 leading-relaxed font-medium max-w-[280px]">
              {description}
            </div>
          </div>
        </div>
        <Button
          variant="action"
          size="sm"
          disabled={isLoading}
          onClick={onEnrich}
          className="w-full sm:w-auto h-10 px-8"
          data-testid={testId}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {loadingLabel}
            </>
          ) : (
            'Récupérer'
          )}
        </Button>
      </div>
    </div>
  );
}
