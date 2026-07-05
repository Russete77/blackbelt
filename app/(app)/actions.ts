"use server";
// Server Actions de criação (projeto/faixa) do grupo (app).
// Usa o client de servidor com a sessão do usuário (anon key + cookies) —
// RLS e auth.uid() se aplicam. NUNCA usar a service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import { extrairYoutubeVideoId } from "@/lib/youtube";
import { extrairSpotifyTrackId, extrairDeezerTrackId } from "@/lib/plataformas";
import { resolverDeezerLinkCurto } from "@/lib/deezer";

export interface EstadoAcao {
  status: "idle" | "ok" | "error";
  message?: string;
}

// Variante de EstadoAcao que carrega o id criado — usada pelo fluxo de
// upload em um passo só (iniciarFaixa), que precisa do faixaId no client
// para seguir com o upload de áudio antes de navegar para a faixa.
export interface EstadoAcaoComId extends EstadoAcao {
  faixaId?: string;
}

const TIPOS_PROJETO = ["single", "ep", "album", "feat"] as const;
const CATEGORIAS_COMENTARIO = ["beat", "mix", "master", "letra", "geral"] as const;
const PRIORIDADES_COMENTARIO = ["alta", "media", "baixa"] as const;

// caminhoSeguro: ver lib/forms.ts (movido de volta para lá — este arquivo é
// "use server", e todo export aqui precisa ser uma Server Action async).

export async function criarProjeto(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const nome = String(formData.get("nome") ?? "").trim();
  const tipoBruto = String(formData.get("tipo") ?? "single");
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!nome) return { status: "error", message: "Informe o nome do projeto." };
  const tipo = (TIPOS_PROJETO as readonly string[]).includes(tipoBruto) ? tipoBruto : "single";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: projeto, error } = await supabase
    .from("projetos")
    .insert({ nome, tipo })
    .select("id")
    .single();
  if (error || !projeto) {
    return { status: "error", message: "Não foi possível criar o projeto. Tente novamente." };
  }

  if (artistaId) {
    const { error: vinculoError } = await supabase
      .from("projeto_artistas")
      .insert({ projeto_id: projeto.id, artista_id: artistaId });
    if (vinculoError) {
      return { status: "error", message: "Projeto criado, mas falhou o vínculo com o artista." };
    }
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Projeto criado." };
}

export async function criarFaixa(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const genero = String(formData.get("genero") ?? "").trim();
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!titulo) return { status: "error", message: "Informe o título da faixa." };
  if (!projetoId) return { status: "error", message: "Projeto inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("faixas")
    .insert({ projeto_id: projetoId, titulo, genero: genero || null });
  if (error) {
    return { status: "error", message: "Não foi possível criar a faixa. Tente novamente." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Faixa criada." };
}

// Fluxo "＋ Subir música" em um passo só: resolve/cria o projeto (opcional
// para quem sobe) e cria a faixa. O upload do áudio em si acontece no client
// (bucket `audio` exige o client do browser) logo depois, usando o faixaId
// devolvido aqui — ver components/estudio/SubirMusica.tsx.
export async function iniciarFaixa(_estado: EstadoAcaoComId, formData: FormData): Promise<EstadoAcaoComId> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const projetoIdExistente = String(formData.get("projetoId") ?? "").trim();
  const novoProjetoNome = String(formData.get("novoProjetoNome") ?? "").trim();
  const novoProjetoTipoBruto = String(formData.get("novoProjetoTipo") ?? "single");
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!titulo) return { status: "error", message: "Informe o nome da música." };
  if (!artistaId) return { status: "error", message: "Artista inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  let projetoId = projetoIdExistente;

  if (!projetoId) {
    // Nenhum projeto existente escolhido: usa o nome informado ou o padrão
    // "Faixas avulsas de {artista}" — em ambos os casos, reaproveita o
    // projeto se ele já existir (find-or-create) em vez de duplicar a cada
    // envio sem projeto escolhido.
    const { data: artista, error: artistaError } = await supabase
      .from("artistas")
      .select("nome")
      .eq("id", artistaId)
      .maybeSingle();
    if (artistaError || !artista) {
      return { status: "error", message: "Artista inválido." };
    }

    const nomeProjeto = novoProjetoNome || `Faixas avulsas de ${artista.nome}`;
    const tipoProjeto = (TIPOS_PROJETO as readonly string[]).includes(novoProjetoTipoBruto)
      ? novoProjetoTipoBruto
      : "single";

    const { data: vinculos, error: vinculosError } = await supabase
      .from("projeto_artistas")
      .select("projeto_id")
      .eq("artista_id", artistaId);
    if (vinculosError) {
      return { status: "error", message: "Não foi possível verificar os projetos do artista." };
    }
    const idsVinculados = (vinculos ?? []).map((v) => v.projeto_id);

    let projetoExistente: { id: string } | null = null;
    if (idsVinculados.length > 0) {
      const { data, error: buscaError } = await supabase
        .from("projetos")
        .select("id")
        .in("id", idsVinculados)
        .eq("nome", nomeProjeto)
        .maybeSingle();
      if (buscaError) {
        return { status: "error", message: "Não foi possível verificar os projetos do artista." };
      }
      projetoExistente = data;
    }

    if (projetoExistente) {
      projetoId = projetoExistente.id;
    } else {
      const { data: novoProjeto, error: criaError } = await supabase
        .from("projetos")
        .insert({ nome: nomeProjeto, tipo: tipoProjeto })
        .select("id")
        .single();
      if (criaError || !novoProjeto) {
        return { status: "error", message: "Não foi possível criar o projeto. Tente novamente." };
      }
      const { error: vinculoError } = await supabase
        .from("projeto_artistas")
        .insert({ projeto_id: novoProjeto.id, artista_id: artistaId });
      if (vinculoError) {
        return { status: "error", message: "Projeto criado, mas falhou o vínculo com o artista." };
      }
      projetoId = novoProjeto.id;
    }
  }

  const { data: faixa, error: faixaError } = await supabase
    .from("faixas")
    .insert({ projeto_id: projetoId, titulo })
    .select("id")
    .single();
  if (faixaError || !faixa) {
    return { status: "error", message: "Não foi possível criar a faixa. Tente novamente." };
  }

  revalidatePath(caminho);
  return { status: "ok", faixaId: faixa.id };
}

// Vincula (ou remove) o vídeo do YouTube de uma faixa: aceita URL completa
// (watch, youtu.be, shorts, embed) ou um id solto de 11 chars — ver
// extrairYoutubeVideoId em lib/youtube.ts. Campo vazio limpa o vínculo
// (útil quando o vídeo mudou ou foi removido).
export async function vincularYoutube(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  const bruto = String(formData.get("youtube") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!faixaId) return { status: "error", message: "Faixa inválida." };

  let videoId: string | null = null;
  if (bruto) {
    videoId = extrairYoutubeVideoId(bruto);
    if (!videoId) {
      return { status: "error", message: "Link ou ID do YouTube inválido. Cole a URL do vídeo ou o id de 11 caracteres." };
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("faixas")
    .update({ youtube_video_id: videoId })
    .eq("id", faixaId);
  if (error) {
    return { status: "error", message: "Não foi possível salvar o link do YouTube. Tente novamente." };
  }

  revalidatePath(caminho);
  return {
    status: "ok",
    message: videoId ? "Vídeo do YouTube vinculado." : "Link do YouTube removido.",
  };
}

const NOMES_PLATAFORMA_VINCULAVEL: Record<"spotify" | "deezer", string> = {
  spotify: "Spotify",
  deezer: "Deezer",
};

// Vincula o link de Spotify/Deezer de uma faixa footprint (ver
// components/faixa/PlayersTabs.tsx): parseia o id da faixa a partir da URL
// colada e grava em spotify_track_id/deezer_track_id — a partir daí o player
// embutido passa a aparecer no lugar do form "colar link".
export async function vincularPlataforma(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  const plataformaBruta = String(formData.get("plataforma") ?? "").trim();
  const bruto = String(formData.get("url") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!faixaId) return { status: "error", message: "Faixa inválida." };
  if (plataformaBruta !== "spotify" && plataformaBruta !== "deezer") {
    return { status: "error", message: "Plataforma inválida." };
  }
  const plataforma = plataformaBruta;
  const rotulo = NOMES_PLATAFORMA_VINCULAVEL[plataforma];
  if (!bruto) return { status: "error", message: `Cole o link do ${rotulo} antes de salvar.` };

  let trackId = plataforma === "spotify" ? extrairSpotifyTrackId(bruto) : extrairDeezerTrackId(bruto);
  if (!trackId && plataforma === "deezer" && /deezer\.page\.link/i.test(bruto)) {
    trackId = await resolverDeezerLinkCurto(bruto);
  }
  if (!trackId) {
    return {
      status: "error",
      message: `Não reconheci esse link do ${rotulo}. Cole o link da faixa (ex.: ${
        plataforma === "spotify" ? "open.spotify.com/track/..." : "deezer.com/track/..."
      }).`,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const coluna = plataforma === "spotify" ? "spotify_track_id" : "deezer_track_id";
  const { error } = await supabase.from("faixas").update({ [coluna]: trackId }).eq("id", faixaId);
  if (error) {
    return { status: "error", message: `Não foi possível salvar o link do ${rotulo}. Tente novamente.` };
  }

  revalidatePath(caminho);
  return { status: "ok", message: `${rotulo} vinculado.` };
}

export async function editarComentario(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  const categoriaBruta = String(formData.get("categoria") ?? "");
  const prioridadeBruta = String(formData.get("prioridade") ?? "");
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!id) return { status: "error", message: "Comentário inválido." };
  if (!texto) return { status: "error", message: "O comentário não pode ficar vazio." };
  if (!(CATEGORIAS_COMENTARIO as readonly string[]).includes(categoriaBruta)) {
    return { status: "error", message: "Categoria inválida." };
  }
  if (!(PRIORIDADES_COMENTARIO as readonly string[]).includes(prioridadeBruta)) {
    return { status: "error", message: "Prioridade inválida." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("comentarios")
    .update({ texto, categoria: categoriaBruta, prioridade: prioridadeBruta })
    .eq("id", id);
  if (error) {
    return { status: "error", message: "Não foi possível salvar a edição. Tente novamente." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Comentário atualizado." };
}

export async function alternarResolvido(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  // O form envia o valor DESEJADO (o oposto do atual), evitando uma leitura extra.
  const resolvido = String(formData.get("resolvido") ?? "") === "true";
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!id) return { status: "error", message: "Comentário inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("comentarios")
    .update({ resolvido })
    .eq("id", id);
  if (error) {
    return { status: "error", message: "Não foi possível atualizar o status. Tente novamente." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: resolvido ? "Comentário resolvido." : "Comentário reaberto." };
}

export async function excluirComentario(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!id) return { status: "error", message: "Comentário inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };
  // A RLS só permite DELETE para admin; checamos o papel no JWT para
  // devolver uma mensagem amigável em vez de um delete silencioso de 0 linhas.
  if (user.app_metadata?.role !== "admin") {
    return { status: "error", message: "Só o admin pode apagar." };
  }

  const { data, error } = await supabase
    .from("comentarios")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    // 0 linhas = a RLS bloqueou (ou o comentário já não existe).
    return { status: "error", message: "Só o admin pode apagar." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Comentário apagado." };
}
