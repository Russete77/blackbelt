import Link from "next/link";
import { Disc3, Users } from "lucide-react";
import { EstudioKanban } from "@/components/estudio/EstudioKanban";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFaixasEstudioComArtista } from "@/lib/db";

// Estúdio = só a produção interna do selo (faixas origem 'estudio'), como
// Kanban por estágio de pipeline. Feats/catálogo/canal importados (origem
// 'footprint') não aparecem aqui — já vivem na aba Feats de cada artista
// (ver lib/db.ts#getFaixasEstudioComArtista, que reusa a mesma exclusão de
// filtrarProjetosEstudio usada lá).
export default async function EstudioPage() {
  const faixas = await getFaixasEstudioComArtista();

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">Estúdio</h1>
          <p className="text-sm text-muted">Produção interna do selo, organizada por estágio de pipeline.</p>
        </div>
        <Link
          href="/artistas"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium transition-colors duration-200 hover:border-accent/50 hover:text-accent"
        >
          <Users className="h-4 w-4" aria-hidden />
          Ver artistas
        </Link>
      </div>

      {faixas.length === 0 ? (
        <EmptyState
          icon={Disc3}
          title="Nenhuma faixa em produção ainda."
          hint="Faixas de estúdio criadas em qualquer artista aparecem aqui, organizadas por estágio de produção."
        />
      ) : (
        <EstudioKanban faixas={faixas} />
      )}
    </div>
  );
}
