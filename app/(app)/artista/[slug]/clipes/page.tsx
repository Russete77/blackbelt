import { notFound } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { getArtista } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";

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
      <h2 className="mb-3 text-lg font-semibold">Clipes</h2>
      <EmptyState
        icon={Clapperboard}
        title={`Nenhum clipe cadastrado ainda para ${artista.nome}.`}
        hint="Este módulo entra em breve — os clipes aparecerão aqui quando publicados."
      />
    </div>
  );
}
