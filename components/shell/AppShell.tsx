import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { PlayerProvider } from "@/components/player/PlayerContext";
import { PlayerBar } from "@/components/player/PlayerBar";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nome = user?.email ?? "";
  if (user) {
    const { data: perfil } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
    if (perfil?.nome) nome = perfil.nome;
  }
  const usuario = user ? { nome, email: user.email ?? "" } : null;

  return (
    <PlayerProvider>
      <div className="min-h-screen flex bg-bg text-fg">
        <Sidebar usuario={usuario} />
        {/* pb-40 = espaço para o player fixo (mobile) + bottom nav */}
        <main role="main" className="flex-1 pb-40 md:pb-24">
          {children}
        </main>
        <PlayerBar />
        <BottomNav />
      </div>
    </PlayerProvider>
  );
}
