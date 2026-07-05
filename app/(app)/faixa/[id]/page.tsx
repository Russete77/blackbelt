import { notFound } from "next/navigation";
import { getFaixa, getVersoesDaFaixa, getComentariosDaVersao, getSignedCoverUrl } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { FaixaClient } from "@/components/faixa/FaixaClient";
import type { Comentario } from "@/types/domain";

export default async function FaixaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const faixa = await getFaixa(id);
  if (!faixa) return notFound();

  // Admin = app_metadata.role no JWT (assinado pelo Supabase) — decide se os
  // controles de apagar comentário aparecem. A RLS continua sendo a barreira real.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.role === "admin";

  // Resolve o caminho da capa (bucket privado) para uma signed URL exibível.
  if (faixa.capaUrl) {
    faixa.capaUrl = (await getSignedCoverUrl(faixa.capaUrl)) ?? undefined;
  }

  const versoes = await getVersoesDaFaixa(faixa.id);
  const listas = await Promise.all(versoes.map((v) => getComentariosDaVersao(v.id)));
  const comentariosPorVersao: Record<string, Comentario[]> = {};
  versoes.forEach((v, i) => {
    comentariosPorVersao[v.id] = listas[i];
  });

  return (
    <FaixaClient
      faixa={faixa}
      versoes={versoes}
      comentariosPorVersao={comentariosPorVersao}
      isAdmin={isAdmin}
    />
  );
}
