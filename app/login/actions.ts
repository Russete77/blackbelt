"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  status: "idle" | "ok" | "error";
  message?: string;
}

// Nota: um arquivo "use server" só pode exportar funções async — a constante
// de estado inicial mora no client component (LoginForm.tsx), não aqui.

export async function enviarLinkMagico(_estado: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { status: "error", message: "Informe um e-mail válido." };
  }

  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      // Acesso por convite: nunca criar usuário novo a partir do formulário.
      shouldCreateUser: false,
    },
  });

  if (error) {
    // "Signups not allowed for otp" = e-mail sem convite
    if (/signup/i.test(error.message) || error.code === "otp_disabled") {
      return {
        status: "error",
        message: "Este e-mail não tem convite. Fale com a Produção para receber acesso.",
      };
    }
    return {
      status: "error",
      message: "Não foi possível enviar o link. Verifique o e-mail e tente novamente.",
    };
  }

  return { status: "ok", message: "Link enviado! Confira seu e-mail para entrar." };
}
