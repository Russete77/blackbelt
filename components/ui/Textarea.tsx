import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-none rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg",
          "outline-none placeholder:text-muted transition-colors duration-200",
          "focus:border-accent",
          className,
        )}
        {...props}
      />
    );
  },
);
