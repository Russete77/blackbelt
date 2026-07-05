import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { PlayerProvider } from "@/components/player/PlayerContext";
import { PlayerBar } from "@/components/player/PlayerBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <div className="min-h-screen flex bg-bg text-fg">
        <Sidebar />
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
