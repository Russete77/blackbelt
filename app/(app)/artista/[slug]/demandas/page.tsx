import { notFound } from "next/navigation";
import { getArtista, getDemandasDoArtista } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { NovaDemandaForm } from "@/components/demandas/NovaDemandaForm";
import { ListaDemandas } from "@/components/demandas/ListaDemandas";

// Aba Demandas do workspace do artista: tarefas/pedidos atribuídos a ele —
// inclui demandas de clipe (título "Clipe: ..."), sem UI própria, é uma
// demanda comum. Criar uma demanda notifica o artista (ver criarDemanda em
// app/(app)/demandas/actions.ts).
export default async function DemandasArtistaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const [demandas, supabase] = await Promise.all([
    getDemandasDoArtista(artista.id),
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const podeExcluir = user?.app_metadata?.role === "admin";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Demandas</h2>
        <NovaDemandaForm artistaId={artista.id} />
      </div>
      <ListaDemandas demandas={demandas} podeExcluir={podeExcluir} caminho={`/artista/${slug}/demandas`} />
    </div>
  );
}
