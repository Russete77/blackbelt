import { HomeView } from "@/components/home/HomeView";
import { getArtistas, getProjetosDoSelo, getFaixasDoProjeto } from "@/lib/db";

export default async function Home() {
  const [artistas, projetosSelo] = await Promise.all([getArtistas(), getProjetosDoSelo()]);
  const projetosComFaixas = await Promise.all(
    projetosSelo.map(async (projeto) => ({ projeto, faixas: await getFaixasDoProjeto(projeto.id) })),
  );

  return <HomeView artistas={artistas} projetosSelo={projetosComFaixas} />;
}
