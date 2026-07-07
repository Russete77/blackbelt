"use server";
// Estúdio de Imagem por IA da faixa: gera capa/artes no formato exato de cada
// plataforma a partir de um briefing + fotos do artista/referências (repagina
// original, sem plágio). gerarCapaIA devolve a imagem em base64 pra preview;
// salvarComoCapa grava no bucket `covers` e vira a capa oficial da faixa.
// Sessão do usuário (RLS aplica); a OPENAI_API_KEY fica só no servidor.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gerarImagemIA, SemChaveImagemError, type ReferenciaImagem } from "@/lib/imagem";
import { formatoPorId } from "@/lib/formatos-imagem";

export interface EstadoCapa {
  status: "idle" | "ok" | "error";
  message?: string;
  imagemBase64?: string;
  formatoId?: string;
  // true quando o formato pode virar a capa oficial (quadrado de streaming).
  ehCapa?: boolean;
}

const MAX_REFS = 6;

export async function gerarCapaIA(_prev: EstadoCapa, formData: FormData): Promise<EstadoCapa> {
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  const formatoId = String(formData.get("formato") ?? "").trim();
  const briefing = String(formData.get("briefing") ?? "").trim();
  const formato = formatoPorId(formatoId);
  if (!faixaId || !formato) return { status: "error", message: "Faixa ou formato inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: faixa } = await supabase.from("faixas").select("titulo, genero").eq("id", faixaId).maybeSingle();

  // Foto(s) do artista PRIMEIRO (o modelo dá mais peso às primeiras imagens),
  // depois referências de estilo. Assim a IA sabe quem é a pessoa a preservar.
  const referencias: ReferenciaImagem[] = [];
  let nFotos = 0;
  for (const item of formData.getAll("fotoArtista")) {
    if (item instanceof File && item.size > 0 && referencias.length < MAX_REFS) {
      referencias.push({ nome: item.name, tipo: item.type, dados: Buffer.from(await item.arrayBuffer()) });
      nFotos++;
    }
  }
  for (const item of formData.getAll("referencias")) {
    if (item instanceof File && item.size > 0 && referencias.length < MAX_REFS) {
      referencias.push({ nome: item.name, tipo: item.type, dados: Buffer.from(await item.arrayBuffer()) });
    }
  }
  const temFoto = nFotos > 0;
  const temEstilo = referencias.length > nFotos;

  const prompt = [
    temFoto
      // MODO RETOQUE: compõe EM CIMA da foto real, sem recriar a pessoa.
      ? `Você é diretor de arte criando "${formato.rotulo}" a PARTIR da foto real do artista. As ${nFotos} PRIMEIRA(S) imagem(ns) é(são) a FOTO DO ARTISTA: preserve 100% o rosto, as feições, o tom de pele, o cabelo e a barba — é a pessoa real. NÃO redesenhe, NÃO idealize, NÃO troque por outra pessoa. Trate como RETOQUE/composição profissional em cima da foto: trabalhe só o fundo, a iluminação cinematográfica, a grade de cor, a profundidade, a atmosfera e o enquadramento de capa em volta dela.`
      : `Crie uma imagem ORIGINAL de "${formato.rotulo}" para um artista de rap/funk brasileiro, cinematográfica e premium.`,
    temEstilo
      ? "As imagens seguintes são apenas REFERÊNCIA DE ESTILO (cor, mood, composição) — inspire-se, mas NÃO copie nenhuma obra existente e NÃO troque o artista."
      : "",
    briefing ? `Direção do artista: ${briefing}.` : "",
    faixa?.genero ? `Estilo: ${faixa.genero} brasileiro.` : "",
    // Título só como conceito — NUNCA vira texto na arte.
    faixa?.titulo ? `Conceito para inspirar (NÃO escrever na imagem): "${faixa.titulo}".` : "",
    "IMPORTANTE: NÃO inclua NENHUM texto, título, nome, palavra, número ou logo na imagem — a menos que o briefing peça um texto explicitamente.",
    formato.capa ? "Capa de streaming: composição quadrada e forte, sem URLs nem @; legível em miniatura." : "",
    "Acabamento premium, editorial, nível de capa profissional.",
  ].filter(Boolean).join(" ");

  try {
    const buf = await gerarImagemIA({ prompt, formato, referencias });
    return { status: "ok", imagemBase64: buf.toString("base64"), formatoId, ehCapa: Boolean(formato.capa) };
  } catch (e) {
    if (e instanceof SemChaveImagemError) {
      return { status: "error", message: "IA de imagem não configurada. Adicione OPENAI_API_KEY no .env.local." };
    }
    return { status: "error", message: `Falha ao gerar a imagem: ${e instanceof Error ? e.message : "erro desconhecido"}` };
  }
}

// Grava a imagem gerada como a capa oficial da faixa (bucket covers, mesmo
// caminho do upload manual: faixa/<id>.jpg) e atualiza faixas.capa_url.
export async function salvarComoCapa(faixaId: string, imagemBase64: string): Promise<EstadoCapa> {
  if (!faixaId || !imagemBase64) return { status: "error", message: "Dados inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const path = `faixa/${faixaId}.jpg`;
  const bytes = Buffer.from(imagemBase64, "base64");
  const { error: upErr } = await supabase.storage
    .from("covers")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (upErr) return { status: "error", message: `Falha ao salvar a capa: ${upErr.message}` };

  const { error: updErr } = await supabase.from("faixas").update({ capa_url: path }).eq("id", faixaId);
  if (updErr) return { status: "error", message: "Imagem salva, mas falhou atualizar a faixa." };

  revalidatePath(`/faixa/${faixaId}`);
  return { status: "ok", message: "Capa da faixa atualizada." };
}
