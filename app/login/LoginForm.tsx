"use client";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import { enviarLinkMagico, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";

const ESTADO_INICIAL: LoginState = { status: "idle" };

export function LoginForm() {
  const [estado, formAction, pendente] = useActionState(enviarLinkMagico, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="text-sm font-medium text-muted" htmlFor="email">
        E-mail
      </label>
      <div className="flex items-center gap-2 rounded-md border border-line bg-surface2 px-3 transition-colors duration-200 focus-within:border-accent">
        <Mail className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="voce@blackbelt.com"
          className="min-h-11 flex-1 bg-transparent py-2 text-sm text-fg outline-none placeholder:text-muted"
        />
      </div>
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Enviando..." : "Enviar link de acesso"}
      </Button>
      {estado.status !== "idle" && (
        <p className={estado.status === "ok" ? "text-sm text-success" : "text-sm text-danger"}>
          {estado.message}
        </p>
      )}
    </form>
  );
}
