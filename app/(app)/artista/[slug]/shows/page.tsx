import { notFound } from "next/navigation";
import { getArtista, getShowsDoArtista } from "@/lib/db";

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
      <h2 className="text-lg font-semibold mb-3">Shows</h2>
      {shows.length === 0 ? (
        <p className="text-sm text-muted">Nenhum show cadastrado ainda para {artista.nome}.</p>
      ) : (
        <ul className="divide-y divide-line">
          {shows.map((s) => (
            <li key={s.id} className="py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.local ?? "Local a definir"}</span>
                {s.status && <span className="text-xs text-muted">{s.status}</span>}
              </div>
              {s.data && (
                <p className="text-xs text-muted">
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
