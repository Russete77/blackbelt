import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { PlayerProvider } from "@/components/player/PlayerContext";
import { PlayerBar } from "@/components/player/PlayerBar";
import { SinoNotificacoes } from "@/components/notificacoes/SinoNotificacoes";
import { createClient } from "@/lib/supabase/server";
import { getNotificacoes, contarNaoLidas } from "@/lib/db";

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

  // Sino de notificações precisa do inbox já resolvido no primeiro paint
  // (sem loading state) — só busca quando há sessão (RLS bloquearia mesmo
  // assim, mas evita a chamada à toa em /login).
  const [notificacoesIniciais, naoLidasIniciais] = user
    ? await Promise.all([getNotificacoes(8), contarNaoLidas()])
    : [[], 0];

  return (
    <PlayerProvider>
      <div className="flex min-h-screen bg-bg text-fg">
        <Sidebar usuario={usuario} />
        {/* pb-40 = espaço para o player fixo (mobile) + bottom nav; min-w-0 evita overflow horizontal do flex */}
        <main role="main" className="min-w-0 flex-1 pb-40 md:pb-24">
          {usuario && (
            <header className="sticky top-0 z-30 flex items-center justify-end border-b border-line bg-bg/95 px-4 py-2 backdrop-blur md:px-6">
              <SinoNotificacoes notificacoesIniciais={notificacoesIniciais} naoLidasIniciais={naoLidasIniciais} />
            </header>
          )}
          {children}
        </main>
        <PlayerBar />
        <BottomNav />
      </div>
    </PlayerProvider>
  );
}
