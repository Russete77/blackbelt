"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const path = usePathname();
  // No celular mostramos só os disponíveis + os principais para não lotar a barra.
  const itens = navItems.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around border-t border-line bg-bg/95 backdrop-blur">
      {itens.map((item) => {
        const ativo = path === item.href;
        const conteudo = (
          <span className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-3 text-[10px]",
            ativo ? "text-accent" : "text-muted",
            !item.disponivel && "opacity-50",
          )}>
            <span aria-hidden className="text-base">{item.icon}</span>
            {item.label}
          </span>
        );
        return item.disponivel ? (
          <Link key={item.href} href={item.href}>{conteudo}</Link>
        ) : (
          <div key={item.href} aria-disabled>{conteudo}</div>
        );
      })}
    </nav>
  );
}
