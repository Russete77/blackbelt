"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isNavAtivo } from "./nav-items";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { UserMenu, type UsuarioSessao } from "./UserMenu";

export function Sidebar({ usuario }: { usuario: UsuarioSessao | null }) {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:gap-1 border-r border-line bg-bg p-4">
      <div className="px-2 py-3 font-display text-2xl uppercase tracking-tight">
        BLACK <span className="text-accent">BELT</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const ativo = isNavAtivo(item.href, path);
          const inner = (
            <span className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200",
              ativo ? "bg-surface2 text-fg" : "text-muted hover:bg-surface2/60 hover:text-fg",
              !item.disponivel && "opacity-60",
            )}>
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-accent transition-all duration-200",
                  ativo ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                )}
              />
              <item.icon className={cn("h-5 w-5 transition-colors duration-200", ativo && "text-accent")} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {!item.disponivel && <Badge tone="neutral">Em breve</Badge>}
            </span>
          );
          return item.disponivel ? (
            <Link key={item.href} href={item.href}>{inner}</Link>
          ) : (
            // Sem aria-disabled: em <div> sem role o atributo é ignorado por
            // leitores de tela — o Badge "Em breve" já comunica o estado.
            <div key={item.href}>{inner}</div>
          );
        })}
      </nav>
      <UserMenu usuario={usuario} />
    </aside>
  );
}
