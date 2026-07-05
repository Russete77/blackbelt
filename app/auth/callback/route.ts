import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Troca o código do magic link por uma sessão (PKCE) e redireciona.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  // Só caminhos internos: bloqueia //host, /\host e URLs absolutas (open redirect).
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")
    ? nextParam
    : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=auth`);
}
