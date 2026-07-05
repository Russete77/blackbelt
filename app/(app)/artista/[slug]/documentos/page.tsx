import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getArtista } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";

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
      <h2 className="mb-3 text-lg font-semibold">Documentos</h2>
      <EmptyState
        icon={FileText}
        title={`Nenhum documento cadastrado ainda para ${artista.nome}.`}
        hint="Este módulo entra em breve — contratos e registros aparecerão aqui."
      />
    </div>
  );
}
