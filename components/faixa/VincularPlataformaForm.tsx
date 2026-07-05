"use client";
// Form pontual "colar link" pra vincular Spotify/Deezer numa faixa footprint
// — some assim que o link é salvo, porque o player embutido passa a ocupar o
// lugar (ver PlayersTabs, que só renderiza este form quando falta o id).
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { Link2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { vincularPlataforma, type EstadoAcao } from "@/app/(app)/actions";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function VincularPlataformaForm({
  faixaId, plataforma, rotulo,
}: {
  faixaId: string;
  plataforma: "spotify" | "deezer";
  rotulo: string;
}) {
  const caminho = usePathname();
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => vincularPlataforma(prev, formData),
    ESTADO_INICIAL,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-lg border border-dashed border-line p-4"
    >
      <input type="hidden" name="faixaId" value={faixaId} />
      <input type="hidden" name="plataforma" value={plataforma} />
      <input type="hidden" name="caminho" value={caminho} />
      <p className="text-sm text-muted">
        Ainda sem link do {rotulo} — cole o link da faixa pra tocar aqui.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input name="url" placeholder={`Link do ${rotulo}`} className="w-full sm:w-72" />
        <Button type="submit" size="sm" disabled={pendente}>
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          {pendente ? "Salvando..." : "Vincular"}
        </Button>
      </div>
      {estado.status === "ok" && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />{estado.message}
        </p>
      )}
      {estado.status === "error" && (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{estado.message}
        </p>
      )}
    </form>
  );
}
