"use server";
// Server Actions do módulo Analytics & Royalties: importação de planilha/CSV
// (o caminho real para números de plataforma/royalties — não há
// auto-scraper) e a sincronização opcional de views do YouTube.
// Usa o client de servidor com a sessão do usuário (RLS se aplica) — NUNCA
// service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import {
  getArtistas, getProjetosDoArtista, getFaixasDosProjetos,
  getFaixasComYoutube, contarStatusYoutube,
} from "@/lib/db";
import {
  parseCSV, parseNumeroPtBR, parseDataCSV, normalizarTexto, CAMPOS_OBRIGATORIOS,
  type CampoCSV,
} from "@/lib/csv";
import { buscarViewCountYoutube, youtubeConfigurado } from "@/lib/youtube";

export interface EstadoImportacao {
  status: "idle" | "ok" | "error";
  message?: string;
  importadas?: number;
  novas?: number;
  substituidas?: number;
  ignoradas?: number;
  motivos?: string[];
}

const ESTADO_IMPORTACAO_INICIAL: EstadoImportacao = { status: "idle" };

interface LinhaPronta {
  artista_id: string;
  faixa_id: string | null;
  plataforma: string;
  data: string;
  streams: number | null;
  receita: number | null;
  moeda: "BRL" | "USD";
}

// Resolve nome (artista ou faixa) contra uma lista candidata, ignorando
// acentos/caixa — mesma tolerância do mapeamento de colunas.
function resolverPorNome<T extends { nome: string }>(nome: string, candidatos: T[]): T | undefined {
  const alvo = normalizarTexto(nome);
  return candidatos.find((c) => normalizarTexto(c.nome) === alvo);
}

// Tamanho de lote compartilhado por métricas (importação CSV e sync do
// YouTube) — grande o suficiente para poucos roundtrips, pequeno o
// suficiente para não estourar o limite de payload do PostgREST.
const TAMANHO_LOTE_METRICAS = 200;

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

export async function importarMetricasCSV(
  _estado: EstadoImportacao,
  formData: FormData,
): Promise<EstadoImportacao> {
  const csvTexto = String(formData.get("csv") ?? "");
  const caminho = caminhoSeguro(formData.get("caminho"));
  const artistaPadraoId = String(formData.get("artistaPadraoId") ?? "").trim() || null;
  const moedaBruta = String(formData.get("moeda") ?? "BRL").trim().toUpperCase();
  const moeda: "BRL" | "USD" = moedaBruta === "USD" ? "USD" : "BRL";

  let mapeamento: Partial<Record<CampoCSV, number>>;
  try {
    mapeamento = JSON.parse(String(formData.get("mapeamento") ?? "{}"));
  } catch {
    return { ...ESTADO_IMPORTACAO_INICIAL, status: "error", message: "Mapeamento de colunas inválido." };
  }

  for (const campo of CAMPOS_OBRIGATORIOS) {
    if (mapeamento[campo] == null) {
      return { status: "error", message: `Selecione a coluna de "${campo}" antes de importar.` };
    }
  }
  if (mapeamento.artista == null && !artistaPadraoId) {
    return {
      status: "error",
      message: "Sem coluna de artista no CSV: escolha um artista padrão para a importação.",
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { linhas } = parseCSV(csvTexto);
  if (linhas.length === 0) {
    return { status: "error", message: "Nenhuma linha de dados encontrada no CSV." };
  }

  const artistas = await getArtistas();
  // Faixas por artista, carregadas sob demanda (só quando o CSV mapeia
  // coluna de faixa) e cacheadas por artistaId para não repetir a consulta
  // a cada linha do mesmo artista.
  const faixasPorArtista = new Map<string, { id: string; titulo: string }[]>();
  async function faixasDoArtista(artistaId: string) {
    const cache = faixasPorArtista.get(artistaId);
    if (cache) return cache;
    const projetos = await getProjetosDoArtista(artistaId);
    const faixasPorProjeto = await getFaixasDosProjetos(projetos.map((p) => p.id));
    const todas = projetos.flatMap((p) => faixasPorProjeto.get(p.id) ?? [])
      .map((f) => ({ id: f.id, titulo: f.titulo }));
    faixasPorArtista.set(artistaId, todas);
    return todas;
  }

  const prontas: LinhaPronta[] = [];
  const motivos = new Map<string, number>();
  const registrarMotivo = (motivo: string, quantidade = 1) =>
    motivos.set(motivo, (motivos.get(motivo) ?? 0) + quantidade);

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const numeroLinha = i + 2; // +1 cabeçalho, +1 para contagem 1-based

    const plataforma = (linha[mapeamento.plataforma!] ?? "").trim();
    if (!plataforma) { registrarMotivo(`linha ${numeroLinha}: plataforma vazia`); continue; }

    const data = parseDataCSV(linha[mapeamento.data!] ?? "");
    if (!data) { registrarMotivo(`linha ${numeroLinha}: data inválida`); continue; }

    const streams = mapeamento.streams != null
      ? (() => { const n = parseNumeroPtBR(linha[mapeamento.streams!] ?? ""); return n != null ? Math.round(n) : null; })()
      : null;
    const receita = mapeamento.receita != null
      ? parseNumeroPtBR(linha[mapeamento.receita!] ?? "")
      : null;
    // Negativos corrompem totais/recebimentos; magnitude absurda é quase
    // sempre coluna mapeada errada — melhor rejeitar a linha com motivo.
    if (streams != null && (streams < 0 || streams > 1e12)) {
      registrarMotivo(`linha ${numeroLinha}: streams fora da faixa válida (${streams})`);
      continue;
    }
    if (receita != null && (receita < 0 || receita > 1e9)) {
      registrarMotivo(`linha ${numeroLinha}: receita fora da faixa válida (${receita})`);
      continue;
    }

    let artistaId: string | null = null;
    if (mapeamento.artista != null) {
      const nomeArtista = (linha[mapeamento.artista] ?? "").trim();
      if (!nomeArtista) {
        artistaId = artistaPadraoId;
      } else {
        const encontrado = resolverPorNome(nomeArtista, artistas);
        if (!encontrado) { registrarMotivo(`linha ${numeroLinha}: artista "${nomeArtista}" não encontrado`); continue; }
        artistaId = encontrado.id;
      }
    } else {
      artistaId = artistaPadraoId;
    }
    if (!artistaId) { registrarMotivo(`linha ${numeroLinha}: sem artista`); continue; }

    let faixaId: string | null = null;
    if (mapeamento.faixa != null) {
      const nomeFaixa = (linha[mapeamento.faixa] ?? "").trim();
      if (nomeFaixa) {
        const faixas = await faixasDoArtista(artistaId);
        faixaId = resolverPorNome(nomeFaixa, faixas.map((f) => ({ ...f, nome: f.titulo })))?.id ?? null;
        // Sem match: segue sem vínculo de faixa (não é motivo de descarte —
        // a linha ainda é válida no nível artista/plataforma).
      }
    }

    prontas.push({ artista_id: artistaId, faixa_id: faixaId, plataforma, data, streams, receita, moeda });
  }

  if (prontas.length === 0) {
    return {
      status: "error",
      message: "Nenhuma linha válida para importar.",
      importadas: 0,
      ignoradas: linhas.length,
      motivos: [...motivos.entries()].slice(0, 6).map(([m, c]) => `${m}${c > 1 ? ` (×${c})` : ""}`),
    };
  }

  // Deduplica dentro do próprio CSV: se a mesma chave (faixa OU artista +
  // plataforma + data) aparecer em mais de uma linha, fica só a última —
  // sem isso, o índice único do banco rejeitaria o lote inteiro por causa
  // de uma duplicata que já vinha do arquivo.
  const chaveDaLinha = (l: LinhaPronta) =>
    l.faixa_id ? `f:${l.faixa_id}|${l.plataforma}|${l.data}` : `a:${l.artista_id}|${l.plataforma}|${l.data}`;

  const prontasPorChave = new Map<string, LinhaPronta>();
  for (const linha of prontas) prontasPorChave.set(chaveDaLinha(linha), linha);
  const duplicadasNoCSV = prontas.length - prontasPorChave.size;
  if (duplicadasNoCSV > 0) {
    registrarMotivo("linha duplicada dentro do próprio CSV (mesma chave) — mantida a última ocorrência", duplicadasNoCSV);
  }
  const prontasUnicas = [...prontasPorChave.values()];

  // Reimportar o mesmo CSV não pode mais só inserir: agora há índice único
  // parcial em (faixa_id, plataforma, data) e em (artista_id, plataforma,
  // data) [quando faixa_id é null]. Resolve com UM select por grupo (com
  // faixa / sem faixa) quais chaves já existem, e faz update nessas —
  // substituição idempotente — e insert só nas chaves novas.
  const comFaixa = prontasUnicas.filter((l) => l.faixa_id != null);
  const semFaixa = prontasUnicas.filter((l) => l.faixa_id == null);
  const existentesPorChave = new Map<string, string>(); // chave -> id da métrica

  if (comFaixa.length > 0) {
    const faixaIds = [...new Set(comFaixa.map((l) => l.faixa_id!))];
    const plataformasFaixa = [...new Set(comFaixa.map((l) => l.plataforma))];
    const { data: existentes, error } = await supabase
      .from("metricas")
      .select("id, faixa_id, plataforma, data")
      .in("faixa_id", faixaIds)
      .in("plataforma", plataformasFaixa);
    if (error) {
      return { status: "error", message: "Não foi possível verificar métricas existentes. Tente novamente." };
    }
    for (const row of existentes ?? []) {
      existentesPorChave.set(`f:${row.faixa_id}|${row.plataforma}|${row.data}`, row.id);
    }
  }

  if (semFaixa.length > 0) {
    const artistaIds = [...new Set(semFaixa.map((l) => l.artista_id))];
    const plataformasArtista = [...new Set(semFaixa.map((l) => l.plataforma))];
    const { data: existentes, error } = await supabase
      .from("metricas")
      .select("id, artista_id, plataforma, data")
      .is("faixa_id", null)
      .in("artista_id", artistaIds)
      .in("plataforma", plataformasArtista);
    if (error) {
      return { status: "error", message: "Não foi possível verificar métricas existentes. Tente novamente." };
    }
    for (const row of existentes ?? []) {
      existentesPorChave.set(`a:${row.artista_id}|${row.plataforma}|${row.data}`, row.id);
    }
  }

  const paraAtualizar: (LinhaPronta & { id: string })[] = [];
  const paraInserir: LinhaPronta[] = [];
  for (const linha of prontasUnicas) {
    const idExistente = existentesPorChave.get(chaveDaLinha(linha));
    if (idExistente) paraAtualizar.push({ ...linha, id: idExistente });
    else paraInserir.push(linha);
  }

  // RLS é avaliada por linha no insert/update, mas o PostgREST trata cada
  // chamada como uma transação só: se uma linha do lote for rejeitada (ex.:
  // artista de outro workspace, para um usuário não-admin), o lote inteiro
  // falha e vira "ignorada" com o motivo do erro — honesto sobre a
  // limitação em vez de fingir sucesso parcial.
  let substituidas = 0;
  let novas = 0;

  for (const lote of emLotes(paraAtualizar, TAMANHO_LOTE_METRICAS)) {
    const { error } = await supabase.from("metricas").upsert(lote, { onConflict: "id" });
    if (error) {
      registrarMotivo(`lote de substituição rejeitado pelo servidor (${error.message})`, lote.length);
    } else {
      substituidas += lote.length;
    }
  }

  for (const lote of emLotes(paraInserir, TAMANHO_LOTE_METRICAS)) {
    const { error } = await supabase.from("metricas").insert(lote);
    if (error) {
      registrarMotivo(`lote de inserção rejeitado pelo servidor (${error.message})`, lote.length);
    } else {
      novas += lote.length;
    }
  }

  const importadas = substituidas + novas;
  const ignoradas = linhas.length - importadas;
  revalidatePath(caminho);

  if (importadas === 0) {
    return {
      status: "error",
      message: "Nenhuma linha foi importada.",
      importadas: 0,
      ignoradas,
      motivos: [...motivos.entries()].slice(0, 6).map(([m, c]) => `${m}${c > 1 ? ` (×${c})` : ""}`),
    };
  }

  return {
    status: "ok",
    message: `${novas} nova(s), ${substituidas} substituída(s)${ignoradas > 0 ? `, ${ignoradas} ignorada(s)` : ""}.`,
    importadas,
    novas,
    substituidas,
    ignoradas,
    motivos: [...motivos.entries()].slice(0, 6).map(([m, c]) => `${m}${c > 1 ? ` (×${c})` : ""}`),
  };
}

// ------------------------------------------------------------------
// YouTube (estrutura) — sincronização pontual e opcional de um vídeo.
// ------------------------------------------------------------------

export interface EstadoYoutube {
  status: "idle" | "ok" | "error";
  message?: string;
}

export async function sincronizarViewsYoutube(
  _estado: EstadoYoutube,
  formData: FormData,
): Promise<EstadoYoutube> {
  const videoId = String(formData.get("videoId") ?? "").trim();
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const faixaId = String(formData.get("faixaId") ?? "").trim() || null;
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!videoId) return { status: "error", message: "Informe o ID do vídeo do YouTube." };
  if (!artistaId) return { status: "error", message: "Artista inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const estatisticas = await buscarViewCountYoutube(videoId);
  if (!estatisticas) {
    return {
      status: "error",
      message: "Não foi possível buscar as views (YOUTUBE_API_KEY ausente ou vídeo inválido).",
    };
  }

  // Snapshot acumulado: mantém UMA linha viva por (artista, faixa,
  // plataforma) — insert puro criava uma linha nova com o TOTAL do vídeo
  // a cada clique, e as agregações somavam tudo.
  const hoje = new Date().toISOString().slice(0, 10);
  let busca = supabase
    .from("metricas")
    .select("id")
    .eq("artista_id", artistaId)
    .eq("plataforma", "youtube");
  busca = faixaId ? busca.eq("faixa_id", faixaId) : busca.is("faixa_id", null);
  const { data: existente, error: buscaError } = await busca
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (buscaError) {
    return { status: "error", message: "Não foi possível salvar a métrica. Tente novamente." };
  }

  const { error } = existente
    ? await supabase
        .from("metricas")
        .update({ streams: estatisticas.viewCount, data: hoje })
        .eq("id", existente.id)
    : await supabase.from("metricas").insert({
        artista_id: artistaId,
        faixa_id: faixaId,
        plataforma: "youtube",
        data: hoje,
        streams: estatisticas.viewCount,
      });
  if (error) {
    return { status: "error", message: "Não foi possível salvar a métrica. Tente novamente." };
  }

  revalidatePath(caminho);
  return {
    status: "ok",
    message: `${estatisticas.viewCount.toLocaleString("pt-BR")} views registradas para "${estatisticas.titulo}".`,
  };
}

// ------------------------------------------------------------------
// YouTube — sincronização em lote (todas as faixas com vídeo vinculado).
// ------------------------------------------------------------------

export interface EstadoSincronizacaoYoutube {
  status: "idle" | "ok" | "error";
  message?: string;
  sincronizadas?: number;
  semVideo?: number;
  erros?: string[];
}

const ESTADO_SINCRONIZACAO_INICIAL: EstadoSincronizacaoYoutube = { status: "idle" };

// Busca viewCount de vários vídeos de uma vez, em lotes de 50 ids (limite
// do endpoint videos.list) — mesma técnica usada em listarVideosCanal(),
// só que aqui devolve um Map por videoId em vez de uma lista ordenada.
async function buscarViewCountsEmLote(
  videoIds: string[],
): Promise<Map<string, { titulo: string; viewCount: number }>> {
  const resultado = new Map<string, { titulo: string; viewCount: number }>();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return resultado;

  const idsUnicos = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];

  for (let i = 0; i < idsUnicos.length; i += 50) {
    const lote = idsUnicos.slice(i, i + 50);
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "statistics,snippet");
      url.searchParams.set("id", lote.join(","));
      url.searchParams.set("key", apiKey);

      const resposta = await fetch(url.toString());
      if (!resposta.ok) {
        console.error(`[analytics] API do YouTube respondeu ${resposta.status} ao buscar estatísticas em lote.`);
        continue;
      }
      const json = (await resposta.json()) as {
        items?: { id?: string; statistics?: { viewCount?: string }; snippet?: { title?: string } }[];
      };
      for (const item of json.items ?? []) {
        if (!item.id) continue;
        const viewCount = Number(item.statistics?.viewCount ?? "0");
        resultado.set(item.id, { titulo: item.snippet?.title ?? "", viewCount: Number.isFinite(viewCount) ? viewCount : 0 });
      }
    } catch (err) {
      console.error("[analytics] falha ao buscar estatísticas do YouTube em lote:", err);
    }
  }

  return resultado;
}

// Para cada faixa com youtube_video_id vinculado: busca o viewCount atual e
// mantém UMA linha viva por (faixa, plataforma "youtube") com a leitura mais
// recente. O viewCount do YouTube é um TOTAL ACUMULADO — gravar uma linha
// por dia fazia as agregações (que somam linhas) inflarem os streams a cada
// sincronização: 30 dias ≈ 30× as views reais, contaminando receita estimada
// e recebimento por split. Snapshot se substitui, não se soma.
export async function sincronizarYoutubeTudo(
  _estado: EstadoSincronizacaoYoutube,
  formData: FormData,
): Promise<EstadoSincronizacaoYoutube> {
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!youtubeConfigurado()) {
    return { ...ESTADO_SINCRONIZACAO_INICIAL, status: "error", message: "Configure YOUTUBE_API_KEY no ambiente para sincronizar views." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const faixas = await getFaixasComYoutube();
  if (faixas.length === 0) {
    return {
      status: "error",
      message: "Nenhuma faixa tem vídeo do YouTube vinculado ainda. Vincule um vídeo na página da faixa.",
      sincronizadas: 0,
    };
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const erros: string[] = [];

  // Estatísticas em lotes de 50 ids (limite do videos.list) em vez de uma
  // chamada por faixa.
  const statsPorVideoId = await buscarViewCountsEmLote(faixas.map((f) => f.youtubeVideoId));

  const faixasComStats = faixas.filter((faixa) => {
    if (statsPorVideoId.has(faixa.youtubeVideoId)) return true;
    erros.push(`"${faixa.titulo}": vídeo inválido, removido ou indisponível.`);
    return false;
  });

  if (faixasComStats.length === 0) {
    revalidatePath(caminho);
    const { semVideo } = await contarStatusYoutube();
    return {
      status: "error",
      message: "Nenhuma faixa foi sincronizada.",
      sincronizadas: 0,
      semVideo,
      erros: erros.slice(0, 8),
    };
  }

  // Um único SELECT resolve quais faixas já têm métrica "youtube" salva —
  // ordenado por data desc, a primeira ocorrência de cada faixa_id é a mais
  // recente (equivalente ao limit(1) por faixa que era feito antes).
  const idsFaixas = faixasComStats.map((f) => f.id);
  const { data: existentes, error: buscaError } = await supabase
    .from("metricas")
    .select("id, faixa_id, artista_id, data")
    .in("faixa_id", idsFaixas)
    .eq("plataforma", "youtube")
    .order("data", { ascending: false });

  if (buscaError) {
    for (const faixa of faixasComStats) erros.push(`"${faixa.titulo}": falha ao verificar métrica existente.`);
    revalidatePath(caminho);
    const { semVideo } = await contarStatusYoutube();
    return {
      status: "error",
      message: "Nenhuma faixa foi sincronizada.",
      sincronizadas: 0,
      semVideo,
      erros: erros.slice(0, 8),
    };
  }

  const existentePorFaixa = new Map<string, { id: string; artistaId: string | null }>();
  for (const row of existentes ?? []) {
    if (!row.faixa_id || existentePorFaixa.has(row.faixa_id)) continue;
    existentePorFaixa.set(row.faixa_id, { id: row.id, artistaId: row.artista_id });
  }

  const faixaPorId = new Map(faixasComStats.map((f) => [f.id, f]));
  const paraAtualizar: { id: string; artista_id: string | null; faixa_id: string; plataforma: string; data: string; streams: number }[] = [];
  const paraInserir: { artista_id: string | null; faixa_id: string; plataforma: string; data: string; streams: number }[] = [];

  for (const faixa of faixasComStats) {
    const streams = statsPorVideoId.get(faixa.youtubeVideoId)!.viewCount;
    const existente = existentePorFaixa.get(faixa.id);
    if (existente) {
      // Nunca sobrescrever um artista_id válido com null (faixa de projeto
      // do Selo sem vínculo devolve artistaId null).
      paraAtualizar.push({
        id: existente.id,
        artista_id: faixa.artistaId ?? existente.artistaId,
        faixa_id: faixa.id,
        plataforma: "youtube",
        data: hoje,
        streams,
      });
    } else {
      paraInserir.push({
        artista_id: faixa.artistaId,
        faixa_id: faixa.id,
        plataforma: "youtube",
        data: hoje,
        streams,
      });
    }
  }

  let sincronizadas = 0;

  for (const lote of emLotes(paraAtualizar, TAMANHO_LOTE_METRICAS)) {
    const { error } = await supabase.from("metricas").upsert(lote, { onConflict: "id" });
    if (error) {
      for (const row of lote) erros.push(`"${faixaPorId.get(row.faixa_id)?.titulo ?? row.faixa_id}": falha ao atualizar a métrica.`);
    } else {
      sincronizadas += lote.length;
    }
  }

  for (const lote of emLotes(paraInserir, TAMANHO_LOTE_METRICAS)) {
    const { error } = await supabase.from("metricas").insert(lote);
    if (error) {
      for (const row of lote) erros.push(`"${faixaPorId.get(row.faixa_id)?.titulo ?? row.faixa_id}": falha ao salvar a métrica.`);
    } else {
      sincronizadas += lote.length;
    }
  }

  revalidatePath(caminho);

  const { semVideo } = await contarStatusYoutube();

  if (sincronizadas === 0) {
    return {
      status: "error",
      message: "Nenhuma faixa foi sincronizada.",
      sincronizadas: 0,
      semVideo,
      erros: erros.slice(0, 8),
    };
  }

  return {
    status: "ok",
    message: `${sincronizadas} faixa(s) sincronizada(s) com o YouTube${erros.length > 0 ? `, ${erros.length} com erro` : ""}.`,
    sincronizadas,
    semVideo,
    erros: erros.slice(0, 8),
  };
}
