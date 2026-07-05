// Cliente Supabase para Server Components, Server Actions e Route Handlers.
// Next 16: cookies() é assíncrono — sempre `await cookies()`.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component (sem acesso de escrita a
            // cookies). Pode ser ignorado: o proxy (middleware) já renova a
            // sessão a cada requisição.
          }
        },
      },
    },
  );
}
