"use client";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import { enviarLinkMagico, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";

const ESTADO_INICIAL: LoginState = { status: "idle" };

export function LoginForm() {
  const [estado, formAction, pendente] = useActionState(enviarLinkMagico, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-sm text-muted" htmlFor="email">
        E-mail
      </label>
      <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3">
        <Mail className="h-4 w-4 text-muted" aria-hidden />
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="voce@blackbelt.com"
          className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted"
        />
      </div>
      <Button type="submit" disabled={pendente}>
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
