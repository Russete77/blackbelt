import { AppShell } from "@/components/shell/AppShell";

// Route group (app): todas as telas autenticadas do produto (Home, Estúdio,
// Faixa, Artistas) ganham a casca (sidebar + player + bottom-nav).
// /login e /auth/callback ficam fora deste grupo, sem a casca.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
