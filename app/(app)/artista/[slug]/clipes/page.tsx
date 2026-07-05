import { notFound } from "next/navigation";
import { getArtista } from "@/lib/db";

// Sem tabela própria no schema ainda (ver spec §2, "Clipes / audiovisual").
// Página real, alcançável pela navegação — preenche quando o módulo nascer.
export default async function ClipesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Clipes</h2>
      <p className="text-sm text-muted">Nenhum clipe cadastrado ainda para {artista.nome}.</p>
    </div>
  );
}
