import { notFound } from "next/navigation";
import {
  getArtista, getFaixasDoArtista, getLancamentosPlanejadosDoArtista, getSignedCoverUrl,
} from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { ListaLancamentos } from "@/components/lancamentos/ListaLancamentos";
import { NovoLancamentoButton } from "@/components/lancamentos/NovoLancamentoButton";

// Aba Lançamentos do workspace do artista: planejamento de release (tabela
// própria `lancamentos` — data, plataformas, ISRC, checklist D-30 -> D0),
// distinto das faixas com estagio='lancado' (que continuam só na aba
// Projetos/Faixas). "Novo lançamento" e "Editar" abrem o mesmo Modal
// (LancamentoFormModal), pré-preenchido em modo edição.
export default async function LancamentosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const [lancamentos, faixas, supabase] = await Promise.all([
    getLancamentosPlanejadosDoArtista(artista.id),
    getFaixasDoArtista(artista.id),
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const podeExcluir = user?.app_metadata?.role === "admin";

  const capasAssinadas = Object.fromEntries(
    await Promise.all(
      lancamentos
        .filter((l) => l.capaUrl)
        .map(async (l) => [l.id, await getSignedCoverUrl(l.capaUrl!)] as const),
    ),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Lançamentos</h2>
        <NovoLancamentoButton artistaId={artista.id} faixas={faixas} />
      </div>
      <ListaLancamentos
        lancamentos={lancamentos}
        artistaId={artista.id}
        faixas={faixas}
        capasAssinadas={capasAssinadas}
        podeExcluir={podeExcluir}
        caminho={`/artista/${slug}/lancamentos`}
      />
    </div>
  );
}
