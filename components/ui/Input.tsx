import { forwardRef } from "react";
import { cn } from "@/lib/cn";

// Input padrão do sistema — usado em todo formulário (login, comentários,
// upload de versão, novo projeto/faixa). Mantém name/value/ref nativos para
// não quebrar Server Actions (FormData lê pelo atributo `name`).
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-11 w-full rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg",
          "outline-none placeholder:text-muted transition-colors duration-200",
          "focus:border-accent",
          "file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-fg",
          className,
        )}
        {...props}
      />
    );
  },
);
