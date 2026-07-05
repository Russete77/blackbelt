import { cn } from "@/lib/cn";

// Wrapper de rótulo + controle para formulários — mesma tipografia/gap em
// todo o produto (NovoComentario, UploadVersao, NovoProjetoForm, etc.).
export function Field({
  label, className, children,
}: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted", className)}>
      {label}
      {children}
    </label>
  );
}
