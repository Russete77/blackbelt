export interface NavItem {
  href: string; label: string; icon: string; disponivel: boolean;
}

// icon = emoji simples por enquanto (troca por lib de ícones depois, se quiser).
export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠", disponivel: true },
  { href: "/estudio", label: "Estúdio", icon: "🎧", disponivel: true },
  { href: "/analytics", label: "Analytics", icon: "📊", disponivel: false },
  { href: "/previsao", label: "Previsão", icon: "🔮", disponivel: false },
  { href: "/shows", label: "Shows", icon: "🎤", disponivel: false },
  { href: "/registro", label: "Registro", icon: "📄", disponivel: false },
];
