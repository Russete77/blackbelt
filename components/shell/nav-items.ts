import type { LucideIcon } from "lucide-react";
import { Home, Headphones, BarChart3, TrendingUp, Mic2, FileText } from "lucide-react";

export interface NavItem {
  href: string; label: string; icon: LucideIcon; disponivel: boolean;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home, disponivel: true },
  { href: "/estudio", label: "Estúdio", icon: Headphones, disponivel: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, disponivel: false },
  { href: "/previsao", label: "Previsão", icon: TrendingUp, disponivel: false },
  { href: "/shows", label: "Shows", icon: Mic2, disponivel: false },
  { href: "/registro", label: "Registro", icon: FileText, disponivel: false },
];
