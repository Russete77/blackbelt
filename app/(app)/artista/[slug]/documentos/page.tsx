import { notFound } from "next/navigation";
import { getArtista, getDocumentosDoArtista, getSignedCoverUrl } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { ListaDocumentos } from "@/components/documentos/ListaDocumentos";
import { NovoDocumentoButton } from "@/components/documentos/NovoDocumentoButton";

// Aba Documentos do workspace do artista: contratos/splits/outros arquivos
// (tabela própria `documentos`). Sem bucket dedicado ainda: o upload reusa o
// bucket privado `covers` (ver DocumentoFormModal) — a URL assinada é
// resolvida aqui com getSignedCoverUrl, mesma função usada por capas.
// "Novo documento" e "Editar" abrem o mesmo Modal (DocumentoFormModal),
// pré-preenchido em modo edição.
export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const [documentos, supabase] = await Promise.all([
    getDocumentosDoArtista(artista.id),
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const podeExcluir = user?.app_metadata?.role === "admin";

  const arquivosAssinados = Object.fromEntries(
    await Promise.all(
      documentos
        .filter((d) => d.arquivoPath)
        .map(async (d) => [d.id, await getSignedCoverUrl(d.arquivoPath!)] as const),
    ),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Documentos</h2>
        <NovoDocumentoButton artistaId={artista.id} />
      </div>
      <ListaDocumentos
        documentos={documentos}
        artistaId={artista.id}
        arquivosAssinados={arquivosAssinados}
        podeExcluir={podeExcluir}
        caminho={`/artista/${slug}/documentos`}
      />
    </div>
  );
}
