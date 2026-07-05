import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Avatar } from "@/components/ui/Avatar";

export interface UsuarioSessao {
  nome: string;
  email: string;
}

export function UserMenu({ usuario }: { usuario: UsuarioSessao | null }) {
  if (!usuario) return null;

  return (
    <div className="mt-2 flex items-center gap-2 border-t border-line px-2 pt-3">
      <Avatar nome={usuario.nome || usuario.email} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{usuario.nome || usuario.email}</p>
        <p className="truncate text-xs text-muted">{usuario.email}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          title="Sair"
          aria-label="Sair"
          className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors duration-200 hover:bg-surface2 hover:text-accent"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
