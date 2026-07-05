// Next.js 16 renomeou o arquivo/convenção "middleware" para "proxy"
// (a antiga convenção middleware.ts está formalmente depreciada).
// Continua rodando em toda requisição, antes das rotas serem renderizadas.
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Roda em tudo, exceto assets estáticos do Next e arquivos de mídia
    // públicos (ícones, imagens de exemplo).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wav|mp3)$).*)",
  ],
};
