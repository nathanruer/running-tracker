import { cn } from "@/lib/utils";

interface LoadingBarProps {
  isLoading: boolean;
  className?: string;
}

export function LoadingBar({ isLoading, className }: LoadingBarProps) {
  return (
    <div
      className={cn(
        "absolute top-0 left-0 right-0 h-[2px] z-50 overflow-hidden bg-transparent transition-opacity duration-300 pointer-events-none",
        isLoading ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div 
        className={cn(
          "h-full w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent origin-left animate-loading-bar",
          !isLoading && "animate-none"
        )} 
      />
    </div>
  );
}
