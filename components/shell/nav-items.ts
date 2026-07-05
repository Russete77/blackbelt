import type { LucideIcon } from "lucide-react";
import { Home, Users, Headphones, BarChart3, TrendingUp, Mic2, FileText } from "lucide-react";

export interface NavItem {
  href: string; label: string; icon: LucideIcon; disponivel: boolean;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home, disponivel: true },
  { href: "/artistas", label: "Artistas", icon: Users, disponivel: true },
  { href: "/estudio", label: "Estúdio", icon: Headphones, disponivel: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, disponivel: false },
  { href: "/previsao", label: "Previsão", icon: TrendingUp, disponivel: false },
  { href: "/shows", label: "Shows", icon: Mic2, disponivel: true },
  { href: "/registro", label: "Registro", icon: FileText, disponivel: false },
];

// Rota ativa por prefixo: /artista/x acende "Artistas", /faixa/y acende
// "Estúdio" — igualdade exata deixava rotas internas sem item ativo.
export function isNavAtivo(href: string, path: string): boolean {
  if (href === "/") return path === "/";
  if (href === "/artistas") return path === "/artistas" || path.startsWith("/artista/");
  if (href === "/estudio") return path.startsWith("/estudio") || path.startsWith("/faixa/");
  return path === href || path.startsWith(`${href}/`);
}

// Barra mobile tem 5 slots: disponíveis primeiro (um módulo novo no fim da
// lista nunca ficava invisível no celular), "Em breve" completa o resto.
export function navItensMobile(): NavItem[] {
  const disponiveis = navItems.filter((i) => i.disponivel);
  const emBreve = navItems.filter((i) => !i.disponivel);
  return [...disponiveis, ...emBreve].slice(0, 5);
}
