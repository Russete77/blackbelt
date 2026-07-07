import { notFound } from "next/navigation";
import { getArtista, getFaixasDoArtista, getClipesDoArtista } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { ListaClipes } from "@/components/clipes/ListaClipes";
import { NovoClipeButton } from "@/components/clipes/NovoClipeButton";
import { RoteiroIA } from "@/components/clipes/RoteiroIA";

// Aba Clipes do workspace do artista: pipeline de videoclipe/curadoria
// audiovisual (tabela própria `clipes`). "Novo clipe" e "Editar" abrem o
// mesmo Modal (ClipeFormModal), pré-preenchido em modo edição.
export default async function ClipesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const [clipes, faixas, supabase] = await Promise.all([
    getClipesDoArtista(artista.id),
    getFaixasDoArtista(artista.id),
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const podeExcluir = user?.app_metadata?.role === "admin";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Clipes</h2>
        <div className="flex flex-wrap items-center gap-2">
          <RoteiroIA faixas={faixas} />
          <NovoClipeButton artistaId={artista.id} faixas={faixas} />
        </div>
      </div>
      <ListaClipes
        clipes={clipes}
        artistaId={artista.id}
        faixas={faixas}
        podeExcluir={podeExcluir}
        caminho={`/artista/${slug}/clipes`}
      />
    </div>
  );
}
