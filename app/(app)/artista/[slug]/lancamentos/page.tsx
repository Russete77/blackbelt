import { notFound } from "next/navigation";
import { getArtista, getLancamentosDoArtista } from "@/lib/db";
import { labelEstagio } from "@/lib/labels";

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
      <h2 className="text-lg font-semibold mb-3">Lançamentos</h2>
      {faixas.length === 0 ? (
        <p className="text-sm text-muted">Nenhum lançamento registrado ainda para {artista.nome}.</p>
      ) : (
        <ul className="divide-y divide-line">
          {faixas.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-2 text-sm">
              <span>{f.titulo}</span>
              <span className="text-xs text-muted">{labelEstagio(f.estagio)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
