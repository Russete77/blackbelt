import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { getArtista, getMetricasDoArtista } from "@/lib/db";
import { formatarDataPura } from "@/lib/datas";
import { EmptyState } from "@/components/ui/EmptyState";

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
      <h2 className="mb-3 text-lg font-semibold">Números</h2>
      {metricas.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={`Nenhuma métrica importada ainda para ${artista.nome}.`}
          hint="Streams e desempenho por plataforma aparecerão aqui assim que forem importados."
        />
      ) : (
        <ul className="divide-y divide-line">
          {metricas.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="truncate">
                {m.plataforma}{" "}
                <span className="font-mono text-xs text-muted">
                  · {formatarDataPura(m.data)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {m.streams != null ? `${m.streams.toLocaleString("pt-BR")} streams` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
