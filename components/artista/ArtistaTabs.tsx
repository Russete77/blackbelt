"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ABAS = [
  { href: "", label: "Projetos/Faixas" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/shows", label: "Shows" },
  { href: "/numeros", label: "Números" },
  { href: "/clipes", label: "Clipes" },
  { href: "/documentos", label: "Documentos" },
];

export function ArtistaTabs({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/artista/${slug}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ABAS.map((aba) => {
        const href = `${base}${aba.href}`;
        const ativo = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition",
              ativo ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
