import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { getArtistas } from "@/lib/db";

export default async function ArtistasPage() {
  const artistas = await getArtistas();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1">Artistas</h1>
      <p className="text-muted mb-6 text-sm">Todos os artistas do selo.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {artistas.length === 0 && (
          <p className="text-sm text-muted">Nenhum artista cadastrado ainda.</p>
        )}
        {artistas.map((a) => (
          <Link key={a.id} href={`/artista/${a.slug}`}>
            <Card className="hover:border-accent transition">
              <CardBody>
                <h3 className="font-semibold">{a.nome}</h3>
                {a.bio && <p className="text-xs text-muted mt-1 line-clamp-2">{a.bio}</p>}
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
