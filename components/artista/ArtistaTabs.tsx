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
  { href: "/importar", label: "Importar" },
];

export function ArtistaTabs({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/artista/${slug}`;

  return (
    <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-line">
      {ABAS.map((aba) => {
        const href = `${base}${aba.href}`;
        const ativo = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative -mb-px whitespace-nowrap px-3 py-2.5 text-sm transition-colors duration-200",
              ativo ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {aba.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 -bottom-px h-0.5 origin-left scale-x-0 rounded-full bg-accent transition-transform duration-200",
                ativo && "scale-x-100",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
