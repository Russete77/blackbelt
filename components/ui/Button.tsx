import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110",
  ghost: "bg-transparent text-fg hover:bg-surface2",
  outline: "border border-line text-fg hover:bg-surface2",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-10 w-10 p-0 justify-center",
};

export function Button({
  variant = "primary", size = "md", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-medium transition disabled:opacity-50",
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  );
}
