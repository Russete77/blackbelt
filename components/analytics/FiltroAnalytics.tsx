"use client";
// Filtros do painel do selo — artista e plataforma, via query string
// (?artista=&plataforma=), mesmo padrão de components/shows/FiltroArtista.tsx.
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";

export function FiltroAnalytics({
  artistas, plataformas,
}: {
  artistas: { id: string; nome: string }[];
  plataformas: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const artista = params.get("artista") ?? "";
  const plataforma = params.get("plataforma") ?? "";

  function atualizar(chave: "artista" | "plataforma", valor: string) {
    const proximos = new URLSearchParams(params.toString());
    if (valor) proximos.set(chave, valor);
    else proximos.delete(chave);
    const query = proximos.toString();
    router.replace(query ? `/analytics?${query}` : "/analytics");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div className="w-full min-w-48 sm:w-52">
        <Select aria-label="Filtrar por artista" value={artista} onChange={(e) => atualizar("artista", e.target.value)}>
          <option value="">Todos os artistas</option>
          {artistas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </Select>
      </div>
      <div className="w-full min-w-40 sm:w-44">
        <Select aria-label="Filtrar por plataforma" value={plataforma} onChange={(e) => atualizar("plataforma", e.target.value)}>
          <option value="">Todas as plataformas</option>
          {plataformas.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>
    </div>
  );
}
