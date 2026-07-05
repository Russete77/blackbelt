import type { Metadata } from "next";
import "./globals.css";

// Layout raiz: fica fora do AppShell de propósito — /login e /auth/callback
// não devem renderizar sidebar/player/bottom-nav (ver app/(app)/layout.tsx).
export const metadata: Metadata = {
  title: "BLACK BELT 360",
  description: "Sistema operacional 360 da gravadora BLACK BELT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
