import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  iconClassName?: string;
}

export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ className, iconClassName, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all shrink-0 active:scale-90",
          className
        )}
        {...props}
      >
        <X className={cn("h-5 w-5", iconClassName)} />
        <span className="sr-only">Fermer</span>
      </button>
    );
  }
);

CloseButton.displayName = "CloseButton";
