import { notFound } from "next/navigation";
import { Mic2 } from "lucide-react";
import { getArtista, getShowsDoArtista } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ShowsArtistaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const shows = await getShowsDoArtista(artista.id);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Shows</h2>
      {shows.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title={`Nenhum show cadastrado ainda para ${artista.nome}.`}
          hint="Datas e locais de shows aparecerão aqui assim que forem cadastrados."
        />
      ) : (
        <ul className="divide-y divide-line">
          {shows.map((s) => (
            <li key={s.id} className="py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{s.local ?? "Local a definir"}</span>
                {s.status && <span className="shrink-0 text-xs text-muted">{s.status}</span>}
              </div>
              {s.data && (
                <p className="font-mono text-xs text-muted">
                  {new Date(s.data).toLocaleDateString("pt-BR")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
