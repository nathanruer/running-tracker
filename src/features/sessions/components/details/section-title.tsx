import { cn } from '@/lib/utils/cn';

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.25em]', className)}>
      {children}
    </h3>
  );
}
