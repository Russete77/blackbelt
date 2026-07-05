// Cliente Supabase para o browser (Client Components).
// Usa a chave pública (anon) — a proteção real é o RLS no banco.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
