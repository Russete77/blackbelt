// Lógica de sessão usada pelo proxy.ts da raiz (Next 16 renomeou
// "middleware" para "proxy" — ver node_modules/next/dist/docs/.../proxy.md).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas acessíveis sem sessão: login por convite e o callback do magic link.
const ROTAS_PUBLICAS = ["/login", "/auth"];

function ehRotaPublica(pathname: string) {
  return ROTAS_PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() valida o token com o servidor de Auth a cada
  // chamada — nunca usar getSession() para decisões de autorização aqui.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !ehRotaPublica(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
