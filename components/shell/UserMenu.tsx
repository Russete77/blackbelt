import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";

export interface UsuarioSessao {
  nome: string;
  email: string;
}

export function UserMenu({ usuario }: { usuario: UsuarioSessao | null }) {
  if (!usuario) return null;
  const iniciais = (usuario.nome || usuario.email).slice(0, 2).toUpperCase();

  return (
    <div className="mt-2 flex items-center gap-2 border-t border-line px-2 pt-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface2 text-xs font-semibold">
        {iniciais}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{usuario.nome || usuario.email}</p>
        <p className="truncate text-xs text-muted">{usuario.email}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          title="Sair"
          aria-label="Sair"
          className="text-muted transition hover:text-accent"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
