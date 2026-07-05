import { HomeView } from "@/components/home/HomeView";
import { getArtistas, getProjetosDoSelo, getFaixasDoProjeto, getSignedCoverUrl } from "@/lib/db";
import type { Artista, Projeto } from "@/types/domain";

// Troca o caminho salvo no banco pela signed URL exibível (bucket privado).
async function comFotoAssinada(a: Artista): Promise<Artista> {
  if (!a.fotoUrl) return a;
  return { ...a, fotoUrl: (await getSignedCoverUrl(a.fotoUrl)) ?? undefined };
}
async function comCapaAssinada(p: Projeto): Promise<Projeto> {
  if (!p.capaUrl) return p;
  return { ...p, capaUrl: (await getSignedCoverUrl(p.capaUrl)) ?? undefined };
}

export default async function Home() {
  const [artistas, projetosSelo] = await Promise.all([getArtistas(), getProjetosDoSelo()]);
  const [artistasComFoto, projetosComFaixas] = await Promise.all([
    Promise.all(artistas.map(comFotoAssinada)),
    Promise.all(
      projetosSelo.map(async (projeto) => ({
        projeto: await comCapaAssinada(projeto),
        faixas: await getFaixasDoProjeto(projeto.id),
      })),
    ),
  ]);

  return <HomeView artistas={artistasComFoto} projetosSelo={projetosComFaixas} />;
}
