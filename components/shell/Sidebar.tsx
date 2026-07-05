"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col gap-1 p-4 border-r border-line bg-bg">
      <div className="px-2 py-3 text-lg font-bold tracking-tight">
        BLACK <span className="text-accent">BELT</span>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const ativo = path === item.href;
          const inner = (
            <span className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
              ativo ? "bg-surface2 text-fg" : "text-muted hover:text-fg hover:bg-surface",
              !item.disponivel && "opacity-60",
            )}>
              <span aria-hidden>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {!item.disponivel && <Badge tone="neutral">Em breve</Badge>}
            </span>
          );
          return item.disponivel ? (
            <Link key={item.href} href={item.href}>{inner}</Link>
          ) : (
            <div key={item.href} aria-disabled>{inner}</div>
          );
        })}
      </nav>
    </aside>
  );
}
