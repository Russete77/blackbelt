"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ABAS = [
  { href: "", label: "Projetos/Faixas" },
  { href: "/feats", label: "Feats" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/shows", label: "Shows" },
  { href: "/demandas", label: "Demandas" },
  { href: "/numeros", label: "Números" },
  { href: "/clipes", label: "Clipes" },
  { href: "/documentos", label: "Documentos" },
  { href: "/importar", label: "Importar" },
];

export function ArtistaTabs({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/artista/${slug}`;

  return (
    <div className="relative">
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
        <Link
          href="/registro"
          className="relative -mb-px flex shrink-0 items-center whitespace-nowrap px-3 py-2.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
        >
          Registro
        </Link>
      </nav>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-bg to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg to-transparent"
      />
    </div>
  );
}
