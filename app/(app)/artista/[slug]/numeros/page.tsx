import { notFound } from "next/navigation";
import { getArtista, getMetricasDoArtista } from "@/lib/db";

export default async function NumerosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const metricas = await getMetricasDoArtista(artista.id);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Números</h2>
      {metricas.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma métrica importada ainda para {artista.nome}.</p>
      ) : (
        <ul className="divide-y divide-line">
          {metricas.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {m.plataforma} · {new Date(m.data).toLocaleDateString("pt-BR")}
              </span>
              <span className="text-xs text-muted">
                {m.streams != null ? `${m.streams.toLocaleString("pt-BR")} streams` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
