import { HomeView } from "@/components/home/HomeView";
import { getArtistas, getProjetosDoSelo, getFaixasDosProjetos, getSignedCoverUrls } from "@/lib/db";

export default async function Home() {
  const [artistas, projetosSelo] = await Promise.all([getArtistas(), getProjetosDoSelo()]);

  // Assina fotos de artista + capas de projeto numa única chamada em lote
  // (era 1 chamada de Storage por artista/projeto).
  const caminhos = [
    ...artistas.map((a) => a.fotoUrl).filter((p): p is string => Boolean(p)),
    ...projetosSelo.map((p) => p.capaUrl).filter((p): p is string => Boolean(p)),
  ];
  const [urlPorPath, faixasPorProjeto] = await Promise.all([
    getSignedCoverUrls(caminhos),
    getFaixasDosProjetos(projetosSelo.map((p) => p.id)),
  ]);

  const artistasComFoto = artistas.map((a) => ({
    ...a,
    fotoUrl: a.fotoUrl ? (urlPorPath.get(a.fotoUrl) ?? undefined) : undefined,
  }));
  const projetosComFaixas = projetosSelo.map((projeto) => ({
    projeto: { ...projeto, capaUrl: projeto.capaUrl ? (urlPorPath.get(projeto.capaUrl) ?? undefined) : undefined },
    faixas: faixasPorProjeto.get(projeto.id) ?? [],
  }));

  return <HomeView artistas={artistasComFoto} projetosSelo={projetosComFaixas} />;
}
