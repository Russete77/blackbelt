import type { Metadata } from "next";
import { Anton, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Tipografia da marca: Anton (display/poster) para o wordmark e títulos,
// Hanken Grotesk para toda a UI/corpo, IBM Plex Mono para números e tempos.
// Expostas como CSS vars e mapeadas em tailwind.config.ts (font-display/sans/mono).
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

// Layout raiz: fica fora do AppShell de propósito — /login e /auth/callback
// não devem renderizar sidebar/player/bottom-nav (ver app/(app)/layout.tsx).
export const metadata: Metadata = {
  title: "BLACK BELT 360",
  description: "Sistema operacional 360 da gravadora BLACK BELT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${anton.variable} ${hankenGrotesk.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">{children}</body>
    </html>
  );
}
