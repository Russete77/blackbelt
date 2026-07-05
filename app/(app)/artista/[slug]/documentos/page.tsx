import { notFound } from "next/navigation";
import { getArtista } from "@/lib/db";

// Sem tabela própria no schema ainda (registros_* cobrem obra/fonograma/
// videograma, não "documentos" genéricos). Página real, preenche depois.
export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Documentos</h2>
      <p className="text-sm text-muted">Nenhum documento cadastrado ainda para {artista.nome}.</p>
    </div>
  );
}
