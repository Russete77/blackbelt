"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItensMobile, isNavAtivo } from "./nav-items";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const path = usePathname();
  // Os 7 módulos cabem via rolagem horizontal — nenhum fica escondido.
  const itens = navItensMobile();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 overflow-x-auto border-t border-line bg-bg/95 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
      {itens.map((item) => {
        const ativo = isNavAtivo(item.href, path);
        const conteudo = (
          <span className={cn(
            "relative flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-[11px] font-medium leading-tight transition-colors duration-200",
            ativo ? "text-accent" : "text-muted",
            !item.disponivel && "opacity-50",
          )}>
            <span
              aria-hidden
              className={cn(
                "absolute top-0 h-0.5 w-8 rounded-full bg-accent transition-transform duration-200",
                ativo ? "scale-x-100" : "scale-x-0",
              )}
            />
            <item.icon className="h-5 w-5" aria-hidden />
            {item.label}
            {!item.disponivel && <span className="sr-only"> (em breve)</span>}
          </span>
        );
        return item.disponivel ? (
          <Link key={item.href} href={item.href} className="w-[76px] shrink-0">{conteudo}</Link>
        ) : (
          <div key={item.href} className="w-[76px] shrink-0">{conteudo}</div>
        );
      })}
    </nav>
  );
}
