import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  mobileTitle?: string;
  className?: string;
  testId?: string;
}

export function PageContainer({ children, mobileTitle, className, testId }: PageContainerProps) {
  return (
    <div data-testid={testId} className={cn("flex-1 h-full overflow-y-auto no-scrollbar py-4 md:py-8 px-2 md:px-6 xl:px-12", className)}>
      <div className="mx-auto max-w-[90rem]">
        {mobileTitle && (
          <h1 className="text-4xl font-black tracking-tight text-primary mb-8 md:hidden px-1">
            {mobileTitle}
          </h1>
        )}
        {children}
      </div>
    </div>
  );
}
