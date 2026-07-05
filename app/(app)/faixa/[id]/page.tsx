import { notFound } from "next/navigation";
import { getFaixa, getVersoesDaFaixa, getComentariosDeVersoes, getSignedCoverUrl } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { FaixaClient } from "@/components/faixa/FaixaClient";

export default async function FaixaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const faixa = await getFaixa(id);
  if (!faixa) return notFound();

  // Admin = app_metadata.role no JWT (assinado pelo Supabase) — decide se os
  // controles de apagar comentário aparecem. A RLS continua sendo a barreira real.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.role === "admin";

  // Resolve a capa numa CÓPIA — getFaixa usa React.cache; mutar o objeto
  // cacheado vazaria a signed URL para outros consumidores do request.
  const capaAssinada = faixa.capaUrl ? (await getSignedCoverUrl(faixa.capaUrl)) ?? undefined : undefined;
  const faixaExibida = { ...faixa, capaUrl: capaAssinada };

  const versoes = await getVersoesDaFaixa(faixa.id);
  const comentariosPorVersao = await getComentariosDeVersoes(versoes.map((v) => v.id));

  return (
    <FaixaClient
      faixa={faixaExibida}
      versoes={versoes}
      comentariosPorVersao={comentariosPorVersao}
      isAdmin={isAdmin}
    />
  );
}
