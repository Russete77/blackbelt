import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { NovoArtistaForm } from "@/components/artista/NovoArtistaForm";
import { getArtistas } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export default async function ArtistasPage() {
  const artistas = await getArtistas();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.role === "admin";

  return (
    <div className="p-4 md:p-6">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-2xl uppercase tracking-tight md:text-3xl">Artistas</h1>
        {isAdmin && <NovoArtistaForm />}
      </div>
      <p className="mb-6 text-sm text-muted">Todos os artistas do selo.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {artistas.length === 0 && (
          <EmptyState
            className="sm:col-span-2 xl:col-span-3"
            icon={Users}
            title="Nenhum artista cadastrado ainda."
            hint="Cadastre o primeiro artista do selo para começar a organizar projetos e faixas."
          />
        )}
        {artistas.map((a, i) => (
          <Link key={a.id} href={`/artista/${a.slug}`} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <Card interactive>
              <CardBody className="flex items-center gap-3">
                <Avatar nome={a.nome} size="sm" />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{a.nome}</h3>
                  {a.bio && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.bio}</p>}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
