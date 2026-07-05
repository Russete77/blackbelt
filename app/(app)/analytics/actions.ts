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
}

// Resolve nome (artista ou faixa) contra uma lista candidata, ignorando
// acentos/caixa — mesma tolerância do mapeamento de colunas.
function resolverPorNome<T extends { nome: string }>(nome: string, candidatos: T[]): T | undefined {
  const alvo = normalizarTexto(nome);
  return candidatos.find((c) => normalizarTexto(c.nome) === alvo);
}

export async function importarMetricasCSV(
  _estado: EstadoImportacao,
  formData: FormData,
): Promise<EstadoImportacao> {
  const csvTexto = String(formData.get("csv") ?? "");
  const caminho = caminhoSeguro(formData.get("caminho"));
  const artistaPadraoId = String(formData.get("artistaPadraoId") ?? "").trim() || null;

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
  const registrarMotivo = (motivo: string) => motivos.set(motivo, (motivos.get(motivo) ?? 0) + 1);

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

    prontas.push({ artista_id: artistaId, faixa_id: faixaId, plataforma, data, streams, receita });
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

  // Insere em lotes concorrentes — RLS é avaliada por linha no insert, mas o
  // PostgREST trata cada chamada .insert() como uma transação só: se uma
  // linha do lote for rejeitada (ex.: artista de outro workspace, para um
  // usuário não-admin), o lote inteiro falha e vira "ignorada" com o motivo
  // do erro — honesto sobre a limitação em vez de fingir sucesso parcial.
  const TAMANHO_LOTE = 200;
  const lotes: LinhaPronta[][] = [];
  for (let i = 0; i < prontas.length; i += TAMANHO_LOTE) lotes.push(prontas.slice(i, i + TAMANHO_LOTE));

  let importadas = 0;
  const resultados = await Promise.all(
    lotes.map((lote) => supabase.from("metricas").insert(lote)),
  );
  for (let i = 0; i < resultados.length; i++) {
    const { error } = resultados[i];
    if (error) {
      registrarMotivo(`lote ${i + 1}: rejeitado pelo servidor (${error.message})`);
    } else {
      importadas += lotes[i].length;
    }
  }

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
    message: `${importadas} linha(s) importada(s)${ignoradas > 0 ? `, ${ignoradas} ignorada(s)` : ""}.`,
    importadas,
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

  const hoje = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("metricas").insert({
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

// Para cada faixa com youtube_video_id vinculado: busca o viewCount atual e
// grava/atualiza a métrica do dia (plataforma "youtube"). Upsert manual por
// (faixa, plataforma, dia) — sem constraint única na tabela, então lemos
// antes de decidir entre update e insert (evita duplicar uma linha por dia
// a cada clique no botão).
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
  let sincronizadas = 0;
  const erros: string[] = [];

  for (const faixa of faixas) {
    const estatisticas = await buscarViewCountYoutube(faixa.youtubeVideoId);
    if (!estatisticas) {
      erros.push(`"${faixa.titulo}": vídeo inválido, removido ou indisponível.`);
      continue;
    }

    const { data: existente, error: buscaError } = await supabase
      .from("metricas")
      .select("id")
      .eq("faixa_id", faixa.id)
      .eq("plataforma", "youtube")
      .eq("data", hoje)
      .maybeSingle();
    if (buscaError) {
      erros.push(`"${faixa.titulo}": falha ao verificar métrica existente.`);
      continue;
    }

    if (existente) {
      const { error } = await supabase
        .from("metricas")
        .update({ streams: estatisticas.viewCount, artista_id: faixa.artistaId })
        .eq("id", existente.id);
      if (error) {
        erros.push(`"${faixa.titulo}": falha ao atualizar a métrica.`);
        continue;
      }
    } else {
      const { error } = await supabase.from("metricas").insert({
        artista_id: faixa.artistaId,
        faixa_id: faixa.id,
        plataforma: "youtube",
        data: hoje,
        streams: estatisticas.viewCount,
      });
      if (error) {
        erros.push(`"${faixa.titulo}": falha ao salvar a métrica.`);
        continue;
      }
    }
    sincronizadas++;
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
