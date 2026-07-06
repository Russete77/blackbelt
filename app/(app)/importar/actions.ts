"use server";
// Server Actions do módulo "Conectar & Importar" (catálogo/canal do artista
// sem colar link por link). Arquivo próprio — não mexe no app/(app)/actions.ts
// compartilhado. Duas fontes: Deezer (catálogo, keyless) e YouTube (canal
// próprio do artista + busca cross-channel para o "footprint" em canais de
// terceiros — gravadoras parceiras, feats). Usa o client de servidor com a
// sessão do usuário (RLS se aplica) — NUNCA service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import { buscarArtistasDeezer, catalogoDeezer, type CandidatoArtistaDeezer } from "@/lib/deezer";
import {
  resolverCanalYoutube, listarVideosCanal, buscarVideosArtistaYoutube,
  youtubeConfigurado, type VideoBuscaYoutube,
} from "@/lib/youtube";
import { youtubeThumbnailUrl } from "@/lib/faixa";

export interface EstadoAcao {
  status: "idle" | "ok" | "error";
  message?: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Find-or-create do projeto "guarda-chuva" de uma importação (Catálogo,
// Canal YouTube, Aparições/Footprint) para o artista, via projeto_artistas —
// mesmo padrão de find-or-create de app/(app)/actions.ts (iniciarFaixa).
// Não é uma Server Action (não exportada) — helper síncrono... na verdade
// assíncrono, mas sem problema: só exports precisam ser Server Actions aqui.
async function garantirProjeto(
  supabase: SupabaseServerClient,
  artistaId: string,
  nomeProjeto: string,
  tipoProjeto: string,
): Promise<string | EstadoAcao> {
  const { data: vinculos, error: vinculosError } = await supabase
    .from("projeto_artistas")
    .select("projeto_id")
    .eq("artista_id", artistaId);
  if (vinculosError) return { status: "error", message: "Não foi possível verificar os projetos do artista." };
  const idsVinculados = (vinculos ?? []).map((v) => v.projeto_id);

  if (idsVinculados.length > 0) {
    const { data: existente, error: buscaError } = await supabase
      .from("projetos")
      .select("id")
      .in("id", idsVinculados)
      .eq("nome", nomeProjeto)
      .maybeSingle();
    if (buscaError) return { status: "error", message: "Não foi possível verificar os projetos do artista." };
    if (existente) return existente.id;
  }

  const { data: novoProjeto, error: criaError } = await supabase
    .from("projetos")
    .insert({ nome: nomeProjeto, tipo: tipoProjeto })
    .select("id")
    .single();
  if (criaError || !novoProjeto) {
    return { status: "error", message: `Não foi possível criar o projeto "${nomeProjeto}". Tente novamente.` };
  }

  const { error: vinculoError } = await supabase
    .from("projeto_artistas")
    .insert({ projeto_id: novoProjeto.id, artista_id: artistaId });
  if (vinculoError) {
    // Sem o vínculo o projeto fica órfão (nenhum artista o referencia) —
    // desfaz a criação em vez de deixar lixo no banco.
    await supabase.from("projetos").delete().eq("id", novoProjeto.id);
    return { status: "error", message: "Projeto criado, mas falhou o vínculo com o artista." };
  }
  return novoProjeto.id;
}

// Split 100% automático do DONO da faixa — só para faixas do catálogo/canal
// PRÓPRIO do artista (importarCatalogoDeezer, sincronizarCanalYoutube). Sem
// isso, "Recebimento do artista" na página Números (getFaixasDoArtistaComNumeros
// em lib/db.ts) ficava sempre "—"/R$0 pra toda faixa autoral recém-importada,
// obrigando a cadastrar o split manualmente faixa por faixa mesmo quando o %
// é óbvio (100%, é o próprio artista). `ignoreDuplicates` = ON CONFLICT DO
// NOTHING: não pisa num split que o usuário já tenha ajustado manualmente.
// NÃO é chamado em importarVideosSelecionados (footprint cross-channel) — ali
// o % é desconhecido (feat em canal de terceiro); fica para o "Definir meu %
// em massa" em app/(app)/splits/massa-actions.ts.
async function criarSplitDono(
  supabase: SupabaseServerClient,
  faixaId: string,
  artistaId: string,
): Promise<void> {
  await supabase.from("faixa_artistas").upsert(
    { faixa_id: faixaId, artista_id: artistaId, papel: "principal", percentual: 100 },
    { onConflict: "faixa_id,artista_id", ignoreDuplicates: true },
  );
}

// ------------------------------------------------------------------
// Deezer — busca de artista (keyless) e importação de catálogo.
// ------------------------------------------------------------------

// Passthrough server-side: a Deezer API não manda cabeçalhos CORS, então a
// busca não pode ser feita direto do browser — precisa passar pelo servidor.
// Sessão validada aqui mesmo (anônimo não usa o servidor como proxy de busca).
export async function buscarCandidatosDeezer(nome: string): Promise<CandidatoArtistaDeezer[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return buscarArtistasDeezer(nome);
}

export async function conectarDeezer(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const deezerArtistId = String(formData.get("deezerArtistId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!artistaId) return { status: "error", message: "Artista inválido." };
  if (!deezerArtistId) return { status: "error", message: "Escolha um artista na busca do Deezer antes de conectar." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: atualizadas, error } = await supabase
    .from("artistas")
    .update({ deezer_artist_id: deezerArtistId })
    .eq("id", artistaId)
    .select("id");
  if (error || !atualizadas || atualizadas.length === 0) {
    // RLS filtrando 0 linhas também é falha — sem o .select() a action
    // respondia "conectado" sem nada ter mudado.
    return { status: "error", message: "Não foi possível conectar o Deezer. Tente novamente." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Deezer conectado." };
}

export interface EstadoImportacaoDeezer extends EstadoAcao {
  criadas?: number;
  existentes?: number;
}

// Importa TODO o catálogo Deezer do artista conectado (top + faixas de todos
// os álbuns) para um projeto "Catálogo" — find-or-create de projeto e
// find-or-create de faixa por título (evita duplicar quando importado 2x).
export async function importarCatalogoDeezer(
  _estado: EstadoImportacaoDeezer,
  formData: FormData,
): Promise<EstadoImportacaoDeezer> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));
  if (!artistaId) return { status: "error", message: "Artista inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: artista, error: artistaError } = await supabase
    .from("artistas")
    .select("id, deezer_artist_id")
    .eq("id", artistaId)
    .maybeSingle();
  if (artistaError || !artista) return { status: "error", message: "Artista inválido." };
  if (!artista.deezer_artist_id) {
    return { status: "error", message: "Conecte o Deezer antes de importar o catálogo." };
  }

  const faixasCatalogo = await catalogoDeezer(artista.deezer_artist_id);
  if (faixasCatalogo.length === 0) {
    return { status: "error", message: "Não foi possível buscar o catálogo no Deezer. Tente novamente." };
  }

  const projetoId = await garantirProjeto(supabase, artistaId, "Catálogo", "album");
  if (typeof projetoId !== "string") return projetoId;

  const { data: faixasExistentes, error: faixasError } = await supabase
    .from("faixas")
    .select("titulo, deezer_track_id")
    .eq("projeto_id", projetoId);
  if (faixasError) return { status: "error", message: "Não foi possível verificar as faixas existentes." };

  // Dedup principal por deezer_track_id (estável mesmo se o título mudar);
  // título só entra como fallback pras faixas antigas sem o track_id gravado.
  const trackIdsExistentes = new Set(
    (faixasExistentes ?? []).map((f) => f.deezer_track_id).filter((id): id is string => Boolean(id)),
  );
  const titulosExistentes = new Set(
    (faixasExistentes ?? []).filter((f) => !f.deezer_track_id).map((f) => f.titulo.trim().toLowerCase()),
  );

  let criadas = 0;
  let existentes = 0;
  let erros = 0;
  let ultimoErro = "";
  for (const faixa of faixasCatalogo) {
    const temTrackId = Boolean(faixa.deezerTrackId);
    const chaveTitulo = faixa.titulo.trim().toLowerCase();
    const jaExiste = temTrackId
      ? trackIdsExistentes.has(faixa.deezerTrackId)
      : titulosExistentes.has(chaveTitulo);
    if (jaExiste) { existentes++; continue; }

    const { data: novaFaixa, error } = await supabase.from("faixas").insert({
      projeto_id: projetoId,
      titulo: faixa.titulo,
      capa_url: faixa.coverUrl ?? null,
      deezer_track_id: faixa.deezerTrackId,
      // Faixa importada é sempre um lançamento externo já existente (feat/
      // catálogo do Deezer) — nunca um estágio de produção interna.
      origem: "footprint",
    }).select("id").single();
    // Erro de insert NÃO é "já existente" — reporta de verdade (não mascara).
    if (error || !novaFaixa) { erros++; ultimoErro = error?.message ?? "erro desconhecido"; continue; }
    if (temTrackId) trackIdsExistentes.add(faixa.deezerTrackId); else titulosExistentes.add(chaveTitulo);
    criadas++;
    // Catálogo é sempre autoral do artista conectado — split do dono automático.
    await criarSplitDono(supabase, novaFaixa.id, artistaId);
  }

  revalidatePath(caminho);
  return {
    status: erros > 0 && criadas === 0 ? "error" : "ok",
    message:
      `${criadas} faixa(s) importada(s)` +
      (existentes > 0 ? `, ${existentes} já existente(s)` : "") +
      (erros > 0 ? `, ${erros} com erro (${ultimoErro})` : "") + ".",
    criadas,
    existentes,
  };
}

// ------------------------------------------------------------------
// YouTube — canal PRÓPRIO do artista/selo (ex.: @BLACKBEELT): conectar +
// sincronizar todos os uploads (vídeos + views) de uma vez.
// ------------------------------------------------------------------

export async function conectarCanalYoutube(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const handleOuUrl = String(formData.get("canal") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!artistaId) return { status: "error", message: "Artista inválido." };
  if (!handleOuUrl) return { status: "error", message: "Informe o @handle ou o link do canal." };
  if (!youtubeConfigurado()) {
    return { status: "error", message: "Configure YOUTUBE_API_KEY no ambiente para conectar um canal." };
  }

  // Sessão ANTES de gastar quota da YouTube API (resolver o canal custa
  // unidades de search — anônimo não deve conseguir queimar a cota do selo).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const canal = await resolverCanalYoutube(handleOuUrl);
  if (!canal) {
    return { status: "error", message: "Canal não encontrado. Confira o @handle ou o link e tente novamente." };
  }

  const { data: atualizadas, error } = await supabase
    .from("artistas")
    .update({ youtube_channel_id: canal.channelId })
    .eq("id", artistaId)
    .select("id");
  if (error || !atualizadas || atualizadas.length === 0) {
    return { status: "error", message: "Não foi possível conectar o canal. Tente novamente." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: `Canal "${canal.titulo}" conectado.` };
}

export interface EstadoSincronizacaoCanal extends EstadoAcao {
  faixasCriadas?: number;
  viewsSincronizadas?: number;
}

// Sincroniza TODOS os uploads do canal conectado: cria a faixa que faltar
// (por vídeo, no projeto "Canal YouTube") e grava/atualiza a métrica do dia
// (upsert manual por faixa+plataforma+dia, mesmo padrão de
// analytics/actions.ts:sincronizarYoutubeTudo).
export async function sincronizarCanalYoutube(
  _estado: EstadoSincronizacaoCanal,
  formData: FormData,
): Promise<EstadoSincronizacaoCanal> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));
  if (!artistaId) return { status: "error", message: "Artista inválido." };
  if (!youtubeConfigurado()) {
    return { status: "error", message: "Configure YOUTUBE_API_KEY no ambiente para sincronizar o canal." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: artista, error: artistaError } = await supabase
    .from("artistas")
    .select("id, youtube_channel_id")
    .eq("id", artistaId)
    .maybeSingle();
  if (artistaError || !artista) return { status: "error", message: "Artista inválido." };
  if (!artista.youtube_channel_id) {
    return { status: "error", message: "Conecte um canal do YouTube antes de sincronizar." };
  }

  const canal = await resolverCanalYoutube(artista.youtube_channel_id);
  if (!canal) {
    return { status: "error", message: "Não foi possível acessar o canal conectado. Tente reconectar." };
  }

  const videos = await listarVideosCanal(canal.uploadsPlaylistId);
  if (videos.length === 0) {
    return { status: "error", message: "Nenhum vídeo encontrado no canal." };
  }

  const projetoId = await garantirProjeto(supabase, artistaId, "Canal YouTube", "single");
  if (typeof projetoId !== "string") return projetoId;

  // Vídeo/faixa é deduplicado por youtube_video_id em QUALQUER projeto do
  // artista (Catálogo, Canal YouTube, Aparições/Footprint) — não só neste
  // projeto —, senão o mesmo vídeo reaparece como faixa duplicada quando já
  // foi importado por outra via (ex.: footprint cross-channel).
  const { data: vinculosArtista, error: vinculosArtistaError } = await supabase
    .from("projeto_artistas")
    .select("projeto_id")
    .eq("artista_id", artistaId);
  if (vinculosArtistaError) return { status: "error", message: "Não foi possível verificar as faixas existentes." };
  const projetosDoArtista = (vinculosArtista ?? []).map((v) => v.projeto_id);

  const { data: faixasExistentes, error: faixasError } = await supabase
    .from("faixas")
    .select("id, titulo, youtube_video_id, projeto_id")
    .in("projeto_id", projetosDoArtista);
  if (faixasError) return { status: "error", message: "Não foi possível verificar as faixas existentes." };

  const porVideoId = new Map<string, { id: string }>();
  // Fallback por título só considera faixas DESTE projeto ainda SEM vínculo de
  // vídeo — se o título bater mas a faixa já tiver um youtube_video_id
  // diferente (vínculo manual ou de outra sincronização), não é a mesma
  // faixa: tratamos como vídeo novo, sem sobrescrever o vínculo existente.
  const porTituloSemVinculo = new Map<string, { id: string }>();
  for (const f of faixasExistentes ?? []) {
    if (f.youtube_video_id) porVideoId.set(f.youtube_video_id, { id: f.id });
    else if (f.projeto_id === projetoId) porTituloSemVinculo.set(f.titulo.trim().toLowerCase(), { id: f.id });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  let faixasCriadas = 0;
  let viewsSincronizadas = 0;
  let erros = 0;
  let ultimoErro = "";

  for (const video of videos) {
    let faixa = porVideoId.get(video.videoId) ?? porTituloSemVinculo.get(video.titulo.trim().toLowerCase());

    if (!faixa) {
      const { data: novaFaixa, error } = await supabase
        .from("faixas")
        .insert({
          projeto_id: projetoId,
          titulo: video.titulo,
          youtube_video_id: video.videoId,
          capa_url: youtubeThumbnailUrl(video.videoId),
          // Vídeo já publicado no canal — é um lançamento, não uma ideia em produção.
          origem: "footprint",
        })
        .select("id")
        .single();
      if (error || !novaFaixa) { erros++; ultimoErro = error?.message ?? "erro desconhecido"; continue; }
      faixa = { id: novaFaixa.id };
      porVideoId.set(video.videoId, faixa);
      faixasCriadas++;
      // Canal PRÓPRIO do artista — split do dono automático (100%).
      await criarSplitDono(supabase, faixa.id, artistaId);
    } else if (!porVideoId.has(video.videoId)) {
      // Faixa já existia (achada por título, garantidamente sem vínculo prévio): vincula agora.
      const { error: updateError } = await supabase
        .from("faixas")
        .update({ youtube_video_id: video.videoId })
        .eq("id", faixa.id);
      if (!updateError) porVideoId.set(video.videoId, faixa);
    }

    if (await upsertMetricaYoutube(supabase, faixa.id, artistaId, video.viewCount, hoje)) viewsSincronizadas++;
  }

  revalidatePath(caminho);
  return {
    status: erros > 0 && faixasCriadas === 0 && viewsSincronizadas === 0 ? "error" : "ok",
    message:
      `${faixasCriadas} faixa(s) nova(s), ${viewsSincronizadas} view(s) sincronizada(s)` +
      (erros > 0 ? `, ${erros} com erro (${ultimoErro})` : "") + ".",
    faixasCriadas,
    viewsSincronizadas,
  };
}

// Snapshot de views por (faixa, plataforma=youtube, data): uma linha por dia,
// preservando a série histórica — se já existe leitura de hoje, atualiza;
// senão insere uma nova linha (dias anteriores continuam intactos). Chave
// alinhada ao índice único parcial metricas_faixa_plataforma_data_uidx.
async function upsertMetricaYoutube(
  supabase: SupabaseServerClient,
  faixaId: string,
  artistaId: string,
  viewCount: number,
  data: string,
): Promise<boolean> {
  const { data: existente, error: buscaError } = await supabase
    .from("metricas")
    .select("id")
    .eq("faixa_id", faixaId)
    .eq("plataforma", "youtube")
    .eq("data", data)
    .maybeSingle();
  if (buscaError) return false;

  if (existente) {
    const { error } = await supabase
      .from("metricas")
      .update({ streams: viewCount, artista_id: artistaId })
      .eq("id", existente.id);
    return !error;
  }
  const { error } = await supabase.from("metricas").insert({
    artista_id: artistaId, faixa_id: faixaId, plataforma: "youtube", data, streams: viewCount,
  });
  return !error;
}

// ------------------------------------------------------------------
// YouTube — busca cross-channel do "footprint" do artista (feats/parcerias
// em canais que o selo não controla: gravadoras parceiras, outros artistas).
// A busca por nome é ruidosa (covers, homônimos, lyric videos de fã), então
// o fluxo exige curadoria humana: a UI lista os resultados e o usuário marca
// quais realmente são do artista antes de importar.
// ------------------------------------------------------------------

// Passthrough server-side: search.list exige a chave da API, que não pode
// vazar pro client. Sessão validada aqui mesmo — cada chamada custa 100
// unidades da quota diária (10k) e não pode depender só do proxy.
export async function buscarFootprintYoutube(termo: string): Promise<VideoBuscaYoutube[]> {
  if (!youtubeConfigurado()) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return buscarVideosArtistaYoutube(termo, 25);
}

export interface EstadoImportacaoFootprint extends EstadoAcao {
  faixasCriadas?: number;
  viewsSincronizadas?: number;
}

// Importa os vídeos MARCADOS pelo usuário (curadoria humana) como faixas
// "externas" — presença do artista em canal de terceiro, sem passar pelo
// pipeline normal de produção — sob o projeto "Aparições/Footprint".
export async function importarVideosSelecionados(
  _estado: EstadoImportacaoFootprint,
  formData: FormData,
): Promise<EstadoImportacaoFootprint> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));
  if (!artistaId) return { status: "error", message: "Artista inválido." };

  let videos: { videoId?: string; titulo?: string; viewCount?: number }[];
  try {
    videos = JSON.parse(String(formData.get("videosJson") ?? "[]"));
  } catch {
    return { status: "error", message: "Seleção de vídeos inválida." };
  }
  const validos = (Array.isArray(videos) ? videos : []).filter(
    (v): v is { videoId: string; titulo: string; viewCount?: number } =>
      Boolean(v?.videoId) && typeof v.titulo === "string" && v.titulo.length > 0,
  );
  if (validos.length === 0) {
    return { status: "error", message: "Marque ao menos um vídeo para importar." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const projetoId = await garantirProjeto(supabase, artistaId, "Aparições/Footprint", "feat");
  if (typeof projetoId !== "string") return projetoId;

  const { data: faixasExistentes, error: faixasError } = await supabase
    .from("faixas")
    .select("id, youtube_video_id")
    .eq("projeto_id", projetoId);
  if (faixasError) return { status: "error", message: "Não foi possível verificar as faixas existentes." };

  const porVideoId = new Map<string, { id: string }>();
  for (const f of faixasExistentes ?? []) {
    if (f.youtube_video_id) porVideoId.set(f.youtube_video_id, { id: f.id });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  let faixasCriadas = 0;
  let viewsSincronizadas = 0;
  let erros = 0;
  let ultimoErro = "";

  for (const video of validos) {
    let faixa = porVideoId.get(video.videoId);

    if (!faixa) {
      const { data: novaFaixa, error } = await supabase
        .from("faixas")
        .insert({
          projeto_id: projetoId,
          titulo: video.titulo,
          youtube_video_id: video.videoId,
          capa_url: youtubeThumbnailUrl(video.videoId),
          // Feat/aparição já publicada em canal de terceiro — footprint, não estúdio.
          origem: "footprint",
        })
        .select("id")
        .single();
      if (error || !novaFaixa) { erros++; ultimoErro = error?.message ?? "erro desconhecido"; continue; }
      faixa = { id: novaFaixa.id };
      porVideoId.set(video.videoId, faixa);
      faixasCriadas++;
    }

    const viewCount = Number.isFinite(video.viewCount) ? Number(video.viewCount) : 0;
    if (await upsertMetricaYoutube(supabase, faixa.id, artistaId, viewCount, hoje)) viewsSincronizadas++;
  }

  revalidatePath(caminho);
  return {
    status: erros > 0 && faixasCriadas === 0 && viewsSincronizadas === 0 ? "error" : "ok",
    message:
      `${faixasCriadas} faixa(s) nova(s) do footprint, ${viewsSincronizadas} view(s) sincronizada(s)` +
      (erros > 0 ? `, ${erros} com erro (${ultimoErro})` : "") + ".",
    faixasCriadas,
    viewsSincronizadas,
  };
}
