import { notFound } from "next/navigation";
import { Music } from "lucide-react";
import { getArtista, getLancamentosDoArtista } from "@/lib/db";
import { labelEstagio } from "@/lib/labels";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function LancamentosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const faixas = await getLancamentosDoArtista(artista.id);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Lançamentos</h2>
      {faixas.length === 0 ? (
        <EmptyState
          icon={Music}
          title={`Nenhum lançamento registrado ainda para ${artista.nome}.`}
          hint="Faixas marcadas como lançadas aparecem aqui automaticamente."
        />
      ) : (
        <ul className="divide-y divide-line">
          {faixas.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="truncate">{f.titulo}</span>
              <span className="shrink-0 text-xs text-muted">{labelEstagio(f.estagio)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
